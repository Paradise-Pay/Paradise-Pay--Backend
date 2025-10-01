import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  const sql = fs.readFileSync(
    path.join(process.cwd(), 'src', 'migrations', '001_init.sql'),
    'utf-8'
  );

  // connect without DB first
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: +(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true
  });

  try {
    await conn.query(sql);
    console.log('Migration ran ✅');
  } finally {
    conn.end();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
