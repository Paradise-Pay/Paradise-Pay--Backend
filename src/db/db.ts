import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = process.env.MYSQL_PUBLIC_URL
  ? mysql.createPool(process.env.MYSQL_PUBLIC_URL)
  : mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: {
        rejectUnauthorized: false,
      },
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: true,
    });

export default pool;
