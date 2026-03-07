import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function check() {
    const fallbackRes = await db.execute(sql`
    SELECT ca.state, 
           COALESCE((SELECT code FROM states s WHERE s.name ILIKE ca.state OR s.code ILIKE ca.state LIMIT 1), ca.state) as state_code,
           COALESCE(c.code, ca.country) as country_code 
    FROM customer_addresses ca
    LEFT JOIN countries c ON c.name ILIKE ca.country OR c.code = ca.country
    WHERE ca.customer_id = 84
    ORDER BY CASE WHEN ca.address_type = 'ship_to' THEN 1 ELSE 2 END ASC, ca.is_primary DESC, ca.id DESC 
    LIMIT 1
  `);
    console.log(fallbackRes.rows);
    process.exit(0);
}
check();
