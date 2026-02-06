import { db } from "../server/db.ts";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("Running migration for Cost Center Categories...");

    try {
        const migrationSql = fs.readFileSync(
            path.join(__dirname, "migrations", "create_cost_center_categories.sql"),
            "utf-8"
        );

        await db.execute(sql.raw(migrationSql));
        console.log("Migration completed successfully.");
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

main();
