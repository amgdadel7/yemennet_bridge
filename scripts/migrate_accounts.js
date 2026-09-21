const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/postgres';

async function main() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query(`
      ALTER TABLE public.accounts 
      ADD COLUMN IF NOT EXISTS subscriber_name text,
      ADD COLUMN IF NOT EXISTS package_name text,
      ADD COLUMN IF NOT EXISTS registration_date text,
      ADD COLUMN IF NOT EXISTS expiry_time text,
      ADD COLUMN IF NOT EXISTS session_cookie text;
    `);
    console.log('Columns added to accounts table in Supabase successfully!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

main();
