import { config } from 'dotenv';
config();

import { createPool } from 'mysql2/promise';

const pool = createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ration_tds',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test MySQL connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL Database connected successfully');
    connection.release();
  } catch (err: any) {
    console.error('❌ MySQL connection error:', err.message);
    console.error('\n📋 Setup instructions:');
    console.error('   1. Install MySQL or XAMPP');
    console.error('   2. Create database: ration_tds');
    console.error('   3. Run: mysql -u root -p < schema.sql');
    console.error('   4. Update .env with DB credentials\n');
  }
})();

export default pool;
