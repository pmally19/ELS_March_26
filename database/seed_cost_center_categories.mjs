import { db } from "../server/db.ts";
import { costCenterCategories } from "../shared/cost-center-categories-schema.ts";
import { sql } from "drizzle-orm";

const categories = [
    { code: "W", name: "Administration", description: "General administration costs" },
    { code: "F", name: "Production", description: "Manufacturing and production costs" },
    { code: "L", name: "Logistics", description: "Warehousing and distribution" },
    { code: "V", name: "Sales & Distribution", description: "Sales, marketing, and distribution" },
    { code: "H", name: "Auxiliary", description: "Auxiliary cost centers" },
    { code: "G", name: "Canteen", description: "Cafeteria and canteen services" },
    { code: "E", name: "R&D", description: "Research and Development" },
    { code: "M", name: "Material", description: "Material management" },
    { code: "S", name: "Social", description: "Social services" },
    { code: "9", name: "Other", description: "Miscellaneous" },
];

async function seed() {
    console.log("Seeding Cost Center Categories...");

    try {
        for (const category of categories) {
            await db
                .insert(costCenterCategories)
                .values(category)
                .onConflictDoUpdate({
                    target: costCenterCategories.code,
                    set: {
                        name: category.name,
                        description: category.description,
                        updated_at: new Date(),
                    },
                });
            console.log(`Processed category: ${category.code} - ${category.name}`);
        }
        console.log("Seeding completed successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding categories:", error);
        process.exit(1);
    }
}

seed();
