const { Client } = require('pg');

async function ensureDatabaseExists() {
	const adminUrl = process.env.ADMIN_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
	const targetDb = process.env.TARGET_DB_NAME || 'mallyerp';
	const client = new Client({ connectionString: adminUrl });
	try {
		await client.connect();
		const { rows } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [targetDb]);
		if (rows.length === 0) {
			await client.query(`CREATE DATABASE ${targetDb}`);
			console.log(`Created database: ${targetDb}`);
		} else {
			console.log(`Database already exists: ${targetDb}`);
		}
	} finally {
		await client.end();
	}
}

ensureDatabaseExists().catch((e) => { console.error(e); process.exit(1); });
