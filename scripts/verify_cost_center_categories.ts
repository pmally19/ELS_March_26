
import { db } from "../server/db";
import { costCenterCategories } from "../shared/cost-center-categories-schema";
import { eq } from "drizzle-orm";

async function verifyCostCenterCategories() {
    console.log("Starting Cost Center Categories Verification...");

    try {
        // 1. Cleanup: Remove any existing test data
        console.log("Cleaning up test data...");
        await db.delete(costCenterCategories).where(eq(costCenterCategories.code, "T1"));
        await db.delete(costCenterCategories).where(eq(costCenterCategories.code, "T2"));

        // 2. Test Create (Single)
        console.log("Testing Create (Single)...");
        const [created] = await db.insert(costCenterCategories).values({
            code: "T1",
            name: "Test Category 1",
            description: "Description 1"
        }).returning();

        if (!created) throw new Error("Failed to create category");
        console.log("✅ Created:", created);

        // 3. Test Read
        console.log("Testing Read...");
        const fetched = await db.select().from(costCenterCategories).where(eq(costCenterCategories.code, "T1"));
        if (fetched.length === 0) throw new Error("Failed to fetch category");
        console.log("✅ Fetched:", fetched[0]);

        // 4. Test Update
        console.log("Testing Update...");
        const [updated] = await db.update(costCenterCategories)
            .set({ name: "Updated Name" })
            .where(eq(costCenterCategories.id, created.id))
            .returning();

        if (updated.name !== "Updated Name") throw new Error("Failed to update category");
        console.log("✅ Updated:", updated);

        // 5. Test Delete
        console.log("Testing Delete...");
        await db.delete(costCenterCategories).where(eq(costCenterCategories.id, created.id));
        const deletedCheck = await db.select().from(costCenterCategories).where(eq(costCenterCategories.id, created.id));
        if (deletedCheck.length > 0) throw new Error("Failed to delete category");
        console.log("✅ Deleted");

        // 6. Test Bulk Import Logic (Simulated)
        console.log("Testing Bulk Import Logic...");
        const importData = [
            { code: "T1", name: "Import 1", description: "Desc 1" }, // Re-using T1
            { code: "T2", name: "Import 2", description: "Desc 2" }
        ];

        for (const item of importData) {
            const existing = await db.select().from(costCenterCategories).where(eq(costCenterCategories.code, item.code));
            if (existing.length === 0) {
                await db.insert(costCenterCategories).values(item);
            }
        }

        const imported = await db.select().from(costCenterCategories).where(eq(costCenterCategories.code, "T2"));
        if (imported.length === 0) throw new Error("Failed to import T2");
        console.log("✅ Bulk Import Logic Verified");

        // Cleanup again
        await db.delete(costCenterCategories).where(eq(costCenterCategories.code, "T1"));
        await db.delete(costCenterCategories).where(eq(costCenterCategories.code, "T2"));

        console.log("🎉 All Tests Passed!");

    } catch (error) {
        console.error("❌ Verification Failed:", error);
        process.exit(1);
    }
}

verifyCostCenterCategories();
