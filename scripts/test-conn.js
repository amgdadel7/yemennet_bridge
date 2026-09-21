const { Client } = require('pg');

async function test(port, user) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    console.log(`SUCCESS on port ${port} with user ${user}!`);
    const res = await client.query('SELECT current_database(), current_user');
    console.log(res.rows[0]);
    await client.end();
    return true;
  } catch (err) {
    console.log(`FAILED on port ${port} with user ${user}:`, err.message);
    try { await client.end(); } catch (e) {}
    return false;
  }
}

async function run() {
  await test(6543, 'postgres.glshrlfjnlhcjzqvijsx');
  await test(5432, 'postgres.glshrlfjnlhcjzqvijsx');
  await test(6543, 'postgres');
  await test(5432, 'postgres');
}

run();
