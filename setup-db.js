const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function initDb() {
  const client = await pool.connect();
  try {
    console.log('Connecting to Aiven PostgreSQL...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(64) PRIMARY KEY,
        type VARCHAR(16) NOT NULL,
        amount NUMERIC NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(64) NOT NULL,
        date DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(64) PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    console.log('Database tables verified and ready!');
  } finally {
    client.release();
    await pool.end();
  }
}

initDb().catch(err => {
  console.error('Database init error:', err);
  process.exit(1);
});
