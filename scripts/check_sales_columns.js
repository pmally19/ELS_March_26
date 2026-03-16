import pg from 'pg';
const { Client } = pg;

const client = new Client({
    connectionString: "postgresql://postgres:Mokshith@21@localhost:5432/mallyerp"
});

async function checkColumns() {
    try {
        await client.connect();

        console.log("Checking for 'sales_offices' table...");
        const query = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'sales_offices'
            ORDER BY ordinal_position;
        `;

        const res = await client.query(query);

        if (res.rows.length === 0) {
            console.log("No table found named 'sales_offices'.");
            // Check for sd_sales_offices as well since schema definition used that
            const query2 = `
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'sd_sales_offices'
                ORDER BY ordinal_position;
            `;
            const res2 = await client.query(query2);
            if (res2.rows.length > 0) {
                console.log("\nFound table 'sd_sales_offices' with columns:");
                console.log("----------------------------------------");
                res2.rows.forEach(row => {
                    console.log(`${row.column_name.padEnd(20)} | ${row.data_type.padEnd(15)} | Nullable: ${row.is_nullable} | Default: ${row.column_default}`);
                });
            }
        } else {
            console.log("Found table 'sales_offices' with columns:");
            console.log("----------------------------------------");
            res.rows.forEach(row => {
                console.log(`${row.column_name.padEnd(20)} | ${row.data_type.padEnd(15)} | Nullable: ${row.is_nullable} | Default: ${row.column_default}`);
            });
        }

    } catch (err) {
        console.error("Error executing query:", err);
    } finally {
        await client.end();
    }
}

checkColumns();
