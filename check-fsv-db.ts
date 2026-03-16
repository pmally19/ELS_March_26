import { db } from "./server/db";
import { financialReportTemplates, reportTemplateNodes, reportNodeAccounts } from "./shared/financial-schema";
import { eq } from "drizzle-orm";

async function run() {
    console.log("--- Templates ---");
    const templates = await db.select().from(financialReportTemplates);
    console.table(templates);

    for (let t of templates) {
        console.log(`\n--- Nodes for Template: ${t.name} (ID: ${t.id}) ---`);
        const nodes = await db.select().from(reportTemplateNodes).where(eq(reportTemplateNodes.templateId, t.id));
        console.table(nodes);

        const nodeIds = nodes.map(n => n.id);
        if (nodeIds.length > 0) {
            console.log(`\n--- Accounts for Template: ${t.name} (ID: ${t.id}) ---`);
            // Querying manually since inArray might complain if empty
            for (let nid of nodeIds) {
                const accounts = await db.select().from(reportNodeAccounts).where(eq(reportNodeAccounts.nodeId, nid));
                if (accounts.length > 0) console.table(accounts);
            }
        }
    }
    process.exit(0);
}

run().catch(console.error);
