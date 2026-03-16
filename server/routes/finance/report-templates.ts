import { Router } from "express";
import { db } from "../../db";
import {
    financialReportTemplates,
    reportTemplateNodes,
    reportNodeAccounts
} from "../../../shared/financial-schema";
import { eq, inArray } from "drizzle-orm";

const router = Router();

// Get all templates
router.get("/", async (req, res) => {
    try {
        const templates = await db.select().from(financialReportTemplates);
        res.json(templates);
    } catch (error) {
        console.error("Error fetching report templates:", error);
        res.status(500).json({ error: "Failed to fetch report templates" });
    }
});

// Get template details including hierarchy
router.get("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

        // 1. Get header
        const templateRows = await db
            .select()
            .from(financialReportTemplates)
            .where(eq(financialReportTemplates.id, id));

        if (templateRows.length === 0) {
            return res.status(404).json({ error: "Template not found" });
        }
        const template = templateRows[0];

        // 2. Get all nodes for this template
        const nodes = await db
            .select()
            .from(reportTemplateNodes)
            .where(eq(reportTemplateNodes.templateId, id))
            .orderBy(reportTemplateNodes.sortOrder);

        // 3. Get all account mappings for these nodes
        let accounts: any[] = [];
        if (nodes.length > 0) {
            const nodeIds = nodes.map(n => n.id);
            accounts = await db
                .select()
                .from(reportNodeAccounts)
                .where(inArray(reportNodeAccounts.nodeId, nodeIds));
        }

        // Attach accounts to nodes
        const nodesWithAccounts = nodes.map(node => ({
            ...node,
            accounts: accounts.filter(a => a.nodeId === node.id)
        }));

        // Build the tree
        const rootNodes = nodesWithAccounts.filter(n => !n.parentNodeId);

        const buildTree = (parentNodes: any[]) => {
            parentNodes.forEach(parent => {
                const children = nodesWithAccounts.filter(n => n.parentNodeId === parent.id);
                parent.children = children;
                if (children.length > 0) {
                    buildTree(children);
                }
            });
        };
        buildTree(rootNodes);

        res.json({
            ...template,
            tree: rootNodes,
            flatNodes: nodesWithAccounts // Sometimes UI prefers flat list
        });

    } catch (error) {
        console.error("Error fetching template details:", error);
        res.status(500).json({ error: "Failed to fetch template details" });
    }
});

// Create a new template header
router.post("/", async (req, res) => {
    try {
        const { code, name, maintLanguage, chartOfAccountsId, isActive } = req.body;

        if (!code || !name) {
            return res.status(400).json({ error: "Code and Name are required" });
        }

        const newTemplate = await db.insert(financialReportTemplates).values({
            code,
            name,
            maintLanguage: maintLanguage || 'EN',
            chartOfAccountsId: chartOfAccountsId ? parseInt(chartOfAccountsId) : null,
            isActive: isActive !== undefined ? isActive : true,
        }).returning();

        res.status(201).json(newTemplate[0]);
    } catch (error: any) {
        console.error("Error creating report template:", error);
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({ error: "Template code already exists" });
        }
        res.status(500).json({ error: "Failed to create report template" });
    }
});

// Update the full tree (Nodes + Accounts)
// We use a simplified approach: delete existing nodes and recreate them to handle hierarchy updates easily
router.post("/:id/nodes", async (req, res) => {
    try {
        const templateId = parseInt(req.params.id);
        if (isNaN(templateId)) return res.status(400).json({ error: "Invalid ID" });

        // The UI should send a flat array of nodes with temporary IDs, and parent references
        const { nodes } = req.body;

        if (!Array.isArray(nodes)) {
            return res.status(400).json({ error: "Nodes array is required" });
        }

        await db.transaction(async (tx) => {
            console.log(`[FSV Debug] Starting node update for template ${templateId}. Received ${nodes.length} nodes from client.`);
            // 1. Delete all existing nodes (Cascade will delete report_node_accounts automatically)
            await tx.delete(reportTemplateNodes).where(eq(reportTemplateNodes.templateId, templateId));

            if (nodes.length === 0) {
                console.log("[FSV Debug] Client sent 0 nodes. Cleared tree.");
                return; // Just clearing the tree
            }

            // 2. Insert nodes level by level to establish new DB IDs
            // A mapping from frontend temp ID to actual DB ID
            const idMapping: Record<string, number> = {};

            // Helper function to insert a node and its children recursively
            const insertNodeRecursive = async (node: any, dbParentId: number | null = null, sortIndex = 0) => {
                console.log(`[FSV Debug] Inserting node: ${node.name} (type: ${node.nodeType}, frontend parent: ${node.parentNodeId}, db Parent: ${dbParentId})`);
                // Insert node
                const [insertedNode] = await tx.insert(reportTemplateNodes).values({
                    templateId,
                    parentNodeId: dbParentId,
                    nodeType: node.nodeType || (dbParentId ? 'GROUP' : 'ROOT'),
                    name: node.name,
                    sortOrder: sortIndex,
                    startOfGroupText: node.startOfGroupText,
                    endOfGroupText: node.endOfGroupText,
                    displayTotalFlag: node.displayTotalFlag !== undefined ? node.displayTotalFlag : true,
                    graduatedTotalText: node.graduatedTotalText,
                    displayGraduatedTotalFlag: node.displayGraduatedTotalFlag || false,
                    drCrShift: node.drCrShift || false,
                    checkSign: node.checkSign || false,
                    displayBalance: node.displayBalance !== undefined ? node.displayBalance : true,
                }).returning();

                idMapping[String(node.id)] = insertedNode.id;

                // Insert its account mappings
                if (node.accounts && Array.isArray(node.accounts) && node.accounts.length > 0) {
                    const accountValues = node.accounts.map((acc: any) => ({
                        nodeId: insertedNode.id,
                        fromAccount: acc.fromAccount,
                        toAccount: acc.toAccount,
                        balanceType: acc.balanceType || 'BOTH'
                    }));
                    await tx.insert(reportNodeAccounts).values(accountValues);
                }

                // Process children by comparing strings
                const children = nodes.filter((n: any) => String(n.parentNodeId) === String(node.id));
                for (let i = 0; i < children.length; i++) {
                    await insertNodeRecursive(children[i], insertedNode.id, i);
                }
            };

            // Find root nodes (no parent or parent not in the list)
            const allNodeIds = nodes.map((n: any) => String(n.id));
            const rootNodes = nodes.filter((n: any) => !n.parentNodeId || !allNodeIds.includes(String(n.parentNodeId)));

            console.log(`[FSV Debug] Identified ${rootNodes.length} root nodes to start insertion.`);

            for (let i = 0; i < rootNodes.length; i++) {
                await insertNodeRecursive(rootNodes[i], null, i);
            }
        });

        console.log(`[FSV Debug] Transaction finished successfully for template ${templateId}`);
        res.json({ success: true, message: "Template tree updated successfully" });

    } catch (error) {
        console.error("Error updating template nodes:", error);
        res.status(500).json({ error: "Failed to update template tree" });
    }
});

// Update a template header
router.put("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

        const { code, name, maintLanguage, chartOfAccountsId, isActive } = req.body;

        if (!code || !name) {
            return res.status(400).json({ error: "Code and Name are required" });
        }

        const updateData: any = { code, name };
        if (maintLanguage !== undefined) updateData.maintLanguage = maintLanguage;
        if (chartOfAccountsId !== undefined) updateData.chartOfAccountsId = chartOfAccountsId ? parseInt(chartOfAccountsId) : null;
        if (isActive !== undefined) updateData.isActive = isActive;
        updateData.updatedAt = new Date();

        const updatedTemplate = await db.update(financialReportTemplates)
            .set(updateData)
            .where(eq(financialReportTemplates.id, id))
            .returning();

        if (updatedTemplate.length === 0) {
            return res.status(404).json({ error: "Template not found" });
        }

        res.json(updatedTemplate[0]);
    } catch (error: any) {
        console.error("Error updating report template:", error);
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({ error: "Template code already exists" });
        }
        res.status(500).json({ error: "Failed to update report template" });
    }
});

// Delete a template (cascade deletes nodes and accounts)
router.delete("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

        const deleted = await db.delete(financialReportTemplates)
            .where(eq(financialReportTemplates.id, id))
            .returning();

        if (deleted.length === 0) {
            return res.status(404).json({ error: "Template not found" });
        }

        res.json({ success: true, message: "Template deleted successfully" });
    } catch (error) {
        console.error("Error deleting report template:", error);
        res.status(500).json({ error: "Failed to delete report template" });
    }
});

export default router;
