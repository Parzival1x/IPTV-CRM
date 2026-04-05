const fs = require('fs/promises');
const path = require('path');
const { Client } = require('pg');

require('dotenv').config({
  path: path.resolve(__dirname, '../../.env')
});

const schemaPath = path.resolve(__dirname, '../supabase/schema.sql');

const run = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to apply the schema.');
  }

  const sql = await fs.readFile(schemaPath, 'utf8');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  try {
    await client.query(sql);
    console.log('Supabase schema applied successfully.');
  } finally {
    await client.end();
  }
};

run().catch((error) => {
  console.error('Failed to apply Supabase schema:', error.message);

  if (error.message.includes('ENOTFOUND')) {
    console.error('Tip: the direct Supabase Postgres host may not be reachable from this network. Use the Session pooler DATABASE_URL from the Supabase Connect panel and try again.');
  }

  process.exit(1);
});
