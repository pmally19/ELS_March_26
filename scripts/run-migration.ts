
import { pool } from "../server/db";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    try {
        const sqlFilePath = path.join(__dirname, "../database/migrations/update-gl-account-groups-number-range.sql");
        const sqlContent = fs.readFileSync(sqlFilePath, "utf-8");

        console.log("Executing migration...");
        await pool.query(sqlContent);
        console.log("Migration executed successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

runMigration();
