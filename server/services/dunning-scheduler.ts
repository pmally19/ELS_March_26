import { pool } from '../db';
import { sendDunningNotice } from './dunning-email';

/**
 * Dunning Scheduler Service
 * Handles automated dunning runs
 */

interface DunningRunOptions {
    procedureId?: number;
    testRun?: boolean;
    sendEmails?: boolean;
    sendLetters?: boolean;
}

interface DunningRunResult {
    runId: number;
    noticesGenerated: number;
    totalAmount: number;
    errors: string[];
}

/**
 * Execute dunning run for a specific procedure or all procedures
 */
export async function executeDunningRun(
    runType: 'manual' | 'scheduled',
    options: DunningRunOptions = {}
): Promise<DunningRunResult> {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Create run log entry
        const runLogResult = await client.query(
            `INSERT INTO dunning_run_log (run_type, procedure_id, status)
       VALUES ($1, $2, 'running')
       RETURNING id`,
            [runType, options.procedureId || null]
        );

        const runId = runLogResult.rows[0].id;
        console.log(`\n🚀 Starting${runType === 'manual' ? ' Manual' : ' Scheduled'} Dunning Run #${runId}`);

        let totalNotices = 0;
        let totalAmount = 0;
        const errors: string[] = [];

        // Get procedures to process
        const proceduresQuery = options.procedureId
            ? `SELECT * FROM dunning_procedures WHERE id = $1 AND is_active = true`
            : `SELECT * FROM dunning_procedures WHERE is_active = true`;

        const proceduresParams = options.procedureId ? [options.procedureId] : [];
        const procedures = await client.query(proceduresQuery, proceduresParams);

        console.log(`   Processing ${procedures.rows.length} procedure(s)...\n`);

        // Process each procedure
        for (const procedure of procedures.rows) {
            try {
                console.log(`   📋 Procedure: ${procedure.procedure_name} (${procedure.procedure_code})`);

                // Get overdue accounts for this procedure
                const overdueAccounts = await client.query(`
          SELECT 
            c.id as customer_id,
            c.customer_code,
            c.name as customer_name,
            c.email as customer_email,
            c.dunning_block,
            c.last_dunning_date,
            c.last_dunning_level,
            SUM(COALESCE(bd.outstanding_amount, bd.total_amount - COALESCE(bd.paid_amount, 0), bd.total_amount)) as total_overdue,
            MAX(bd.due_date) as oldest_due_date,
            (CURRENT_DATE - MAX(bd.due_date))::integer as days_overdue
          FROM erp_customers c
          INNER JOIN billing_documents bd ON c.id = bd.customer_id
          WHERE COALESCE(bd.outstanding_amount, bd.total_amount - COALESCE(bd.paid_amount, 0), bd.total_amount) > 0
            AND bd.due_date IS NOT NULL
            AND bd.due_date < CURRENT_DATE
            AND (bd.posting_status = 'POSTED' OR bd.posting_status = 'OPEN')
            AND c.is_active = true
            AND (c.dunning_block IS NULL OR c.dunning_block = false)
          GROUP BY c.id, c.customer_code, c.name, c.email, c.dunning_block, c.last_dunning_date, c.last_dunning_level
          HAVING SUM(COALESCE(bd.outstanding_amount, bd.total_amount - COALESCE(bd.paid_amount, 0), bd.total_amount)) >= $1
          ORDER BY days_overdue DESC
        `, [procedure.minimum_amount || 0]);

                console.log(`      Found ${overdueAccounts.rows.length} overdue account(s)`);

                for (const account of overdueAccounts.rows) {
                    const daysOverdue = parseInt(account.days_overdue) || 0;

                    // Determine dunning level
                    let dunningLevel = 1;
                    if (daysOverdue >= procedure.legal_action_days) {
                        dunningLevel = 4;
                    } else if (daysOverdue >= procedure.final_notice_days) {
                        dunningLevel = 3;
                    } else if (daysOverdue >= procedure.level3_days) {
                        dunningLevel = 3;
                    } else if (daysOverdue >= procedure.level2_days) {
                        dunningLevel = 2;
                    } else if (daysOverdue >= procedure.level1_days) {
                        dunningLevel = 1;
                    } else {
                        continue; // Not yet eligible for dunning
                    }

                    // Skip if same level was already sent recently (within 7 days)
                    if (account.last_dunning_level === dunningLevel && account.last_dunning_date) {
                        const daysSinceLastDunning = Math.floor(
                            (new Date().getTime() - new Date(account.last_dunning_date).getTime()) / (1000 * 60 * 60 * 24)
                        );
                        if (daysSinceLastDunning < 7) {
                            console.log(`      ⏭️  ${account.customer_name}: Skipping (Level ${dunningLevel} sent ${daysSinceLastDunning} days ago)`);
                            continue;
                        }
                    }

                    // Calculate amounts
                    const outstandingAmount = parseFloat(account.total_overdue || 0);
                    const interestAmount = outstandingAmount * (parseFloat(procedure.interest_rate || 0) / 100) * (daysOverdue / 365);
                    const dunningAmount = outstandingAmount + interestAmount + parseFloat(procedure.dunning_fee || 0);

                    if (!options.testRun) {
                        // Insert dunning history record
                        const insertResult = await client.query(
                            `INSERT INTO dunning_history (
                customer_id, dunning_procedure_id, dunning_level, dunning_date,
                outstanding_amount, dunning_amount, interest_amount, dunning_status,
                dunning_text, created_by
              ) VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, 'sent', $7, $8)
              RETURNING id`,
                            [
                                account.customer_id,
                                procedure.id,
                                dunningLevel,
                                outstandingAmount,
                                dunningAmount,
                                interestAmount,
                                `Automated dunning notice for overdue amount of $${outstandingAmount.toFixed(2)}. Days overdue: ${daysOverdue}.`,
                                runType === 'scheduled' ? 'system' : 'admin'
                            ]
                        );

                        const dunningHistoryId = insertResult.rows[0].id;

                        // Send email/letter if configured
                        if (options.sendEmails || options.sendLetters) {
                            await sendDunningNotice(
                                dunningHistoryId,
                                account.customer_id,
                                account.customer_name,
                                account.customer_email,
                                dunningAmount,
                                daysOverdue,
                                dunningLevel,
                                options.sendEmails !== false,
                                options.sendLetters === true
                            );
                        }

                        // Update customer last dunning info
                        await client.query(
                            `UPDATE erp_customers
               SET last_dunning_date = CURRENT_DATE,
                   last_dunning_level = $1
               WHERE id = $2`,
                            [dunningLevel, account.customer_id]
                        );

                        // Apply automatic blocking if needed
                        if (daysOverdue >= procedure.blocking_days && dunningLevel >= 3) {
                            await client.query(
                                `UPDATE erp_customers
                 SET dunning_block = true
                 WHERE id = $1`,
                                [account.customer_id]
                            );
                            console.log(`      🚫 ${account.customer_name}: BLOCKED (${daysOverdue} days overdue)`);
                        }
                    }

                    totalNotices++;
                    totalAmount += dunningAmount;

                    console.log(`      ✓ ${account.customer_name}: Level ${dunningLevel}, $${dunningAmount.toFixed(2)} (${daysOverdue} days)`);
                }

            } catch (error: any) {
                console.error(`      ❌ Error processing procedure ${procedure.procedure_code}:`, error.message);
                errors.push(`Procedure ${procedure.procedure_code}: ${error.message}`);
            }
        }

        // Update run log
        await client.query(
            `UPDATE dunning_run_log
       SET notices_generated = $1,
           total_amount = $2,
           status = $3,
           completed_at = CURRENT_TIMESTAMP,
           error_message = $4
       WHERE id = $5`,
            [totalNotices, totalAmount, errors.length > 0 ? 'completed_with_errors' : 'completed', errors.join('; ') || null, runId]
        );

        await client.query('COMMIT');

        console.log(`\n✅ Dunning Run #${runId} Complete`);
        console.log(`   Notices Generated: ${totalNotices}`);
        console.log(`   Total Amount: $${totalAmount.toFixed(2)}`);
        if (errors.length > 0) {
            console.log(`   ⚠️  Errors: ${errors.length}`);
        }

        return {
            runId,
            noticesGenerated: totalNotices,
            totalAmount,
            errors,
        };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Dunning run failed:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Schedule automated dunning runs
 * To enable: Install node-cron: npm install node-cron @types/node-cron
 */
export function scheduleDunningRuns() {
    // Uncomment when ready to enable automated scheduling:
    /*
    import cron from 'node-cron';
    
    // Run every day at 6:00 AM
    cron.schedule('0 6 * * *', async () => {
      console.log('\n⏰ Scheduled Dunning Run Starting...');
      try {
        await executeDunningRun('scheduled', {
          sendEmails: true,
          sendLetters: false,
        });
      } catch (error) {
        console.error('Scheduled dunning run failed:', error);
      }
    });
    
    console.log('📅 Dunning scheduler activated (runs daily at 6:00 AM)');
    */

    console.log('📅 Dunning scheduler: Manual mode (automated scheduling disabled)');
    console.log('   To enable: Uncomment code in server/services/dunning-scheduler.ts');
}
