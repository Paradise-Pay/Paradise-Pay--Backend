import pool from '../db/db';

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    const conn = await pool.getConnection();
    
    // Test basic connection
    const [rows] = await conn.execute('SELECT 1 as test');
    console.log('✅ Database connection successful:', rows);
    
    // Test if tables exist
    const [tables] = await conn.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
    `);
    console.log('📋 Available tables:', (tables as any[]).map((t: any) => t.TABLE_NAME));
    
    // Test users table
    const [users] = await conn.execute('SELECT COUNT(*) as count FROM users');
    console.log('👥 Users in database:', (users as any[])[0].count);
    
    // Test events table
    const [events] = await conn.execute('SELECT COUNT(*) as count FROM events');
    console.log('🎉 Events in database:', (events as any[])[0].count);
    
    conn.release();
    console.log('✅ Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testDatabaseConnection()
    .then(() => {
      console.log('🎉 Database test passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database test failed:', error);
      process.exit(1);
    });
}

export { testDatabaseConnection };
