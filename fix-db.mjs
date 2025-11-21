import 'dotenv/config';
import postgres from 'postgres';

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

console.log('🔧 Starting database schema fix...');

// Create postgres connection
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

async function fixDatabase() {
  try {
        // Check if users table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      )
    `;
    
    if (!tableExists[0].exists) {
      console.log('⚠️  Users table does not exist yet, skipping fix (will be created by migration)');
      await sql.end();
      process.exit(0);
    }
    
    console.log('📦 Adding missing columns to users table...');
    
    // Add email_verified column
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS email_verified integer DEFAULT 0 NOT NULL
    `;
    console.log('✅ Added email_verified column');
    
    // Add verification_token column
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS verification_token text
    `;
    console.log('✅ Added verification_token column');
    
    // Add verification_token_expiry column
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS verification_token_expiry timestamp
    `;
    console.log('✅ Added verification_token_expiry column');
    
    // Add reset_password_token column
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS reset_password_token text
    `;
    console.log('✅ Added reset_password_token column');
    
    // Add reset_password_token_expiry column
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS reset_password_token_expiry timestamp
    `;
    console.log('✅ Added reset_password_token_expiry column');
    
    console.log('✅ Database schema fix completed successfully!');
    
    // Close connection
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database fix failed:', error);
    await sql.end();
    process.exit(1);
  }
}

fixDatabase();
