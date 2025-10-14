import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function debugSeeding() {
  console.log('🔍 Debug: Starting database connection test...');
  console.log('🔍 Environment variables:');
  console.log('   DB_HOST:', process.env.DB_HOST);
  console.log('   DB_PORT:', process.env.DB_PORT);
  console.log('   DB_USER:', process.env.DB_USER);
  console.log('   DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'NOT SET');
  console.log('   DB_NAME:', process.env.DB_NAME);

  let conn;
  try {
    console.log('🔍 Attempting to connect to database...');
    
    // Try connecting without database first
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: +(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });
    
    console.log('✅ Connected to MySQL server');
    
    // Test if database exists
    const [databases] = await conn.execute('SHOW DATABASES');
    console.log('📋 Available databases:', (databases as any[]).map((db: any) => db.Database));
    
    const targetDb = process.env.DB_NAME;
    const dbExists = (databases as any[]).some((db: any) => db.Database === targetDb);
    
    if (dbExists) {
      console.log(`✅ Database '${targetDb}' exists`);
      
      // Connect to the specific database
      await conn.execute(`USE ${targetDb}`);
      
      // Check tables
      const [tables] = await conn.execute('SHOW TABLES');
      console.log('📋 Tables in database:', (tables as any[]).map((t: any) => Object.values(t)[0]));
      
      // Test a simple query
      try {
        const [users] = await conn.execute('SELECT COUNT(*) as count FROM users');
        console.log('👥 Users count:', (users as any[])[0].count);
      } catch (error) {
        console.log('❌ Users table query failed:', (error as Error).message);
      }
      
    } else {
      console.log(`❌ Database '${targetDb}' does not exist`);
      console.log('💡 You may need to create the database first');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', (error as Error).message);
    console.error('Full error:', error);
  } finally {
    if (conn) {
      await conn.end();
      console.log('🔍 Connection closed');
    }
  }
}

// Run debug if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  debugSeeding()
    .then(() => {
      console.log('🎉 Debug completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Debug failed:', error);
      process.exit(1);
    });
}

export { debugSeeding };
