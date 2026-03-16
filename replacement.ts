  async determineAccounts(
    materialCategory: string | null,
    movementType: string,
    valuationClass: string | null,
    plantCode: string,
    materialCode: string,
    plantId?: number,
    client?: any
  ): Promise<{ debitAccount: string; creditAccount: string } | null> {
    const queryClient = client || this.pool;

    if (!valuationClass) {
      // Try to determine valuation class from materials if not passed directly
      try {
        if (client) await client.query('SAVEPOINT get_valclass');
        
        const matResult = await queryClient.query(
          \`SELECT vc.class_code 
           FROM materials m
           LEFT JOIN valuation_classes vc ON m.valuation_class_id = vc.id
           WHERE m.code = $1 LIMIT 1\`,
          [materialCode]
        );
        
        if (matResult.rows.length > 0 && matResult.rows[0].class_code) {
          valuationClass = matResult.rows[0].class_code;
        } else {
          // Alternative: check if material_categories has it
          const catResult = await queryClient.query(
            \`SELECT vc.class_code 
             FROM materials m
             LEFT JOIN material_categories mc ON m.category_id = mc.id
             LEFT JOIN valuation_classes vc ON mc.valuation_class_id = vc.id
             WHERE m.code = $1 LIMIT 1\`,
            [materialCode]
          );
          if (catResult.rows.length > 0 && catResult.rows[0].class_code) {
            valuationClass = catResult.rows[0].class_code;
          }
        }
        if (client) await client.query('RELEASE SAVEPOINT get_valclass');
      } catch (e: any) {
        if (client) {
          try { await client.query('ROLLBACK TO SAVEPOINT get_valclass'); } catch (e2) {}
        }
      }
    }

    if (!valuationClass) {
      throw new Error(\`Valuation class is required for account determination (Material: \${materialCode})\`);
    }

    // Determine transaction keys from movement type (Standard SAP OBYC logic)
    let debitTk = '';
    let creditTk = '';

    switch (movementType) {
      case '601': // Goods Issue for Delivery (PGI)
      case '543': // Goods Issue Transfer
        debitTk = 'GBB';
        creditTk = 'BSX';
        break;
      case '101': // Goods Receipt against PO
      case '561': // Initial Entry
      case '541': // Goods Receipt Transfer
        debitTk = 'BSX';
        creditTk = 'WRX'; // GBB or WRX depending on exact process
        if (movementType === '561' || movementType === '541') {
          creditTk = 'GBB';
        }
        break;
      case '702': // Scrapping
        debitTk = 'GBB';
        creditTk = 'BSX';
        break;
      default:
        console.warn(\`[AccountDetermination] No distinct transaction keys hardcoded for movement type \${movementType}\`);
        // Fallback for custom movement types to basic PGI flow
        debitTk = 'GBB';
        creditTk = 'BSX';
    }

    let debitAccount: string | null = null;
    let creditAccount: string | null = null;

    try {
      if (client) await client.query('SAVEPOINT account_determination');

      // Query OBYC (material_account_determination join transaction_keys join valuation_classes)
      const obycQuery = \`
        SELECT tk.code as tk_code, gl.account_number 
        FROM material_account_determination mad
        JOIN transaction_keys tk ON mad.transaction_key_id = tk.id
        JOIN valuation_classes vc ON mad.valuation_class_id = vc.id
        JOIN gl_accounts gl ON mad.gl_account_id = gl.id
        WHERE tk.code IN ($1, $2)
          AND vc.class_code = $3
          AND mad.is_active = true
      \`;
      const obycResult = await queryClient.query(obycQuery, [debitTk, creditTk, valuationClass]);
      
      for (const row of obycResult.rows) {
        if (row.tk_code === debitTk) debitAccount = row.account_number;
        // Handle case where debit and credit might be the same TK
        if (row.tk_code === creditTk) creditAccount = row.account_number;
      }

      if (client) await client.query('RELEASE SAVEPOINT account_determination');
    } catch (error: any) {
      if (client) {
        try { await client.query('ROLLBACK TO SAVEPOINT account_determination'); } catch (rollbackError) {}
      }
      console.error('[AccountDetermination] Query failed:', error);
    }

    if (!debitAccount || !creditAccount) {
      throw new Error(
        \`STRICT VERIFICATION FAILED: Account determination failed for material \${materialCode}, movement type \${movementType}. \` +
        \`No exact rule found in OBYC material_account_determination table for valuation_class=\${valuationClass}, \` +
        \`required transaction keys: Debit=\${debitTk}, Credit=\${creditTk}. \` +
        \`Please configure the necessary rules in the system.\`
      );
    }

    return {
      debitAccount,
      creditAccount,
    };
  }
