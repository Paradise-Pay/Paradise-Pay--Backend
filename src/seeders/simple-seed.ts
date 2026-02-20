import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function simpleSeed() {
  console.log('🌱 Simple seeding test starting...');
  
  let conn;
  try {
    console.log('🔍 Connecting to database...');
    console.log(`   Host: ${process.env.DB_HOST}`);
    console.log(`   Database: ${process.env.DB_NAME}`);
    
    // Connect to MySQL without specifying database first
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: +(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });
    
    console.log('✅ Connected to MySQL server');
    
    // Check if the database exists
    const [databases] = await conn.execute('SHOW DATABASES');
    const dbExists = (databases as any[]).some((db: any) => db.Database === process.env.DB_NAME);
    
    if (!dbExists) {
      console.log(`❌ Database '${process.env.DB_NAME}' does not exist`);
      console.log('📋 Available databases:');
      (databases as any[]).forEach((db: any) => {
        console.log(`   - ${db.Database}`);
      });
      console.log('💡 Please create the database first or update your .env file');
      return;
    }
    
    console.log(`✅ Database '${process.env.DB_NAME}' exists`);
    
    // Connect to the specific database
    await conn.execute(`USE ${process.env.DB_NAME}`);
    console.log(`✅ Connected to database '${process.env.DB_NAME}'`);
    
    // Check tables
    const [tables] = await conn.execute('SHOW TABLES');
    console.log('📋 Available tables:');
    (tables as any[]).forEach((table: any) => {
      console.log(`   - ${Object.values(table)[0]}`);
    });
    
    // Test inserting a simple user
    console.log('🧪 Testing user insertion...');
    try {
      await conn.execute(`
        INSERT INTO users (user_id, name, email, password_hash, role, email_verified) 
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name)
      `, [
        'test-seed-user',
        'Test Seed User', 
        'testseed@example.com',
        'hashed_password',
        'User',
        1
      ]);
      console.log('✅ User insertion test successful');
    } catch (error) {
      console.log('❌ User insertion failed:', (error as Error).message);
    }
    
    // Count users
    const [users] = await conn.execute('SELECT COUNT(*) as count FROM users');
    console.log(`👥 Total users in database: ${(users as any[])[0].count}`);
    
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    console.error('Full error:', error);
  } finally {
    if (conn) {
      await conn.end();
      console.log('🔍 Connection closed');
    }
  }
  
  console.log('🎉 Simple seeding test completed!');
}

// Run if this file is executed directly
if (require.main === module) {
  simpleSeed()
    .then(() => {
      console.log('✅ Simple seed completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Simple seed failed:', error);
      process.exit(1);
    });
}

export { simpleSeed };
