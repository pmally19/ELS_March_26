import { Router } from "express";
import { db } from "../../db";
import { sql } from "drizzle-orm";
import {
    financialReportTemplates,
    reportTemplateNodes,
    reportNodeAccounts
} from "../../../shared/financial-schema";
import { eq, inArray } from "drizzle-orm";

const router = Router();

// Run a financial statement report based on a template
router.get("/generate", async (req, res) => {
    try {
        const templateId = parseInt(req.query.templateId as string);
        const companyCode = req.query.companyCode as string;
        const fiscalYear = parseInt(req.query.fiscalYear as string);
        const period = parseInt(req.query.period as string) || 12;

        if (!templateId || !fiscalYear) {
            return res.status(400).json({ error: "templateId and fiscalYear are required" });
        }

        // 1. Fetch Template Header
        const templateRows = await db
            .select()
            .from(financialReportTemplates)
            .where(eq(financialReportTemplates.id, templateId));

        if (templateRows.length === 0) {
            return res.status(404).json({ error: "Template not found" });
        }
        const template = templateRows[0];

        // 2. Fetch Hierarchy
        const nodes = await db
            .select()
            .from(reportTemplateNodes)
            .where(eq(reportTemplateNodes.templateId, templateId))
            .orderBy(reportTemplateNodes.sortOrder);

        let accounts: any[] = [];
        if (nodes.length > 0) {
            const nodeIds = nodes.map(n => n.id);
            accounts = await db
                .select()
                .from(reportNodeAccounts)
                .where(inArray(reportNodeAccounts.nodeId, nodeIds));
        }

        // 3. Fetch Transactional Balances
        // We sum gl_entries for the given year up to the given period.
        // 'S' (Debit) is positive, 'H' (Credit) is negative.
        // We join gl_entries.gl_account_id to gl_accounts.id to get the string account_number
        let balanceQuery = `
      SELECT account_number, SUM(amount_value) as total_balance
      FROM (
        SELECT 
          a.account_number,
          (
            CASE 
              WHEN e.debit_credit_indicator = 'S' THEN e.amount 
              WHEN e.debit_credit_indicator = 'H' THEN -e.amount 
              ELSE e.amount 
            END
          ) as amount_value
        FROM gl_entries e
        JOIN gl_accounts a ON e.gl_account_id = a.id
        WHERE e.fiscal_year = $1 AND e.fiscal_period <= $2

        UNION ALL

        SELECT 
          jeli.gl_account as account_number,
          (COALESCE(jeli.debit_amount, 0) - COALESCE(jeli.credit_amount, 0)) as amount_value
        FROM journal_entry_line_items jeli
        JOIN journal_entries je ON jeli.journal_entry_id = je.id
        WHERE je.fiscal_year = $1 AND je.fiscal_period::integer <= $2
      ) combined_balances
    `;
        const queryParams: any[] = [fiscalYear, period];

        // Note: If companyCode is needed, we need to join company_codes or check e.cost_center_id etc.
        // Assuming transactions are implicitly filtered by tenant/company if applicable, but we'll add it if gl_accounts has company_code_id
        // For now, group by account number.
        balanceQuery += ` GROUP BY account_number`;

        const { rows: balances } = await db.execute(sql.raw(
            balanceQuery.replace(/\$1/g, fiscalYear.toString()).replace(/\$2/g, period.toString())
        ));

        // Convert balances to a map for easy lookup
        // "100000" -> 5000.00
        const balanceMap: Record<string, number> = {};
        balances.forEach((b: any) => {
            balanceMap[b.account_number] = parseFloat(b.total_balance) || 0;
        });

        // 4. Map Accounts to Nodes and Roll up Balances
        const nodesWithData = nodes.map(node => ({
            ...node,
            accounts: accounts.filter(a => a.nodeId === node.id),
            balance: 0,
            children: [] as any[]
        }));

        // First pass: Calculate leaf node balances based on assigned accounts
        nodesWithData.forEach(node => {
            let nodeBalance = 0;
            node.accounts.forEach(acc => {
                const fromAcc = acc.fromAccount;
                const toAcc = acc.toAccount;
                const balType = acc.balanceType; // 'BOTH', 'DEBIT_ONLY', 'CREDIT_ONLY'

                // Map balances that fall in this range
                Object.keys(balanceMap).forEach(accountNum => {
                    // Simple string comparison for account ranges (assumes numeric string fixed length)
                    if (accountNum >= fromAcc && accountNum <= toAcc) {
                        const accBal = balanceMap[accountNum];

                        // Apply balance type rules (e.g. Asset node only takes positive balances, Liability takes negative)
                        if (balType === 'DEBIT_ONLY' && accBal > 0) {
                            nodeBalance += accBal;
                        } else if (balType === 'CREDIT_ONLY' && accBal < 0) {
                            nodeBalance += accBal; // Usually Credit is shown as positive in liabilities, we can do Math.abs later
                        } else if (balType === 'BOTH' || !balType) {
                            nodeBalance += accBal;
                        }
                    }
                });
            });
            node.balance = nodeBalance;
        });

        // Second pass: Build tree and roll up balances
        const rootNodes = nodesWithData.filter(n => !n.parentNodeId);

        const calculateTotals = (node: any): number => {
            let total = parseFloat(node.balance || 0);
            const children = nodesWithData.filter(n => n.parentNodeId === node.id);

            children.forEach(child => {
                total += calculateTotals(child);
            });

            node.children = children;
            node.balance = total;
            return total;
        };

        rootNodes.forEach(root => {
            calculateTotals(root);
        });

        res.json({
            template,
            parameters: { companyCode, fiscalYear, period },
            report: rootNodes
        });

    } catch (error) {
        console.error("Error generating financial statement:", error);
        res.status(500).json({ error: "Failed to generate financial statement report" });
    }
});

export default router;
