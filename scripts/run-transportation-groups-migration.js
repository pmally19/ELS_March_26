
import { db } from "../server/db";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    console.log("Starting Transportation Groups Migration...");

    try {
        const migrationPath = path.join(__dirname, "../migrations/019_create_transportation_groups.sql");
        const migrationSql = fs.readFileSync(migrationPath, "utf8");

        console.log("Executing SQL...");
        await db.execute(sql.raw(migrationSql));

        console.log("Migration completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

runMigration();
