import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  // 001_init.sql now includes 002 (event ticketing) and 004 (comprehensive features)
  const initSql = fs.readFileSync(
    path.join(process.cwd(), 'src', 'migrations', '001_init.sql'),
    'utf-8'
  );

  const emailSubscriptionsSql = fs.readFileSync(
    path.join(process.cwd(), 'src', 'migrations', '003_email_subscriptions.sql'),
    'utf-8'
  );

  const sql = initSql + '\n' + emailSubscriptionsSql;

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
