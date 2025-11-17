import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

console.log('🔄 Starting database migration...');

// Create postgres connection for migrations
const migrationClient = postgres(process.env.DATABASE_URL, { max: 1 });

// Run migrations
async function runMigrations() {
  try {
    console.log('📦 Running migrations from ./migrations directory...');
    
    const db = drizzle(migrationClient);
    await migrate(db, { migrationsFolder: './migrations' });
    
    console.log('✅ Database migration completed successfully!');
    
    // Close connection
    await migrationClient.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await migrationClient.end();
    process.exit(1);
  }
}

runMigrations();
