import { Database } from './connection';
import { Migrations } from './migrations';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function migrate() {
  try {
    console.log('🔍 Environment check:');
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('PGHOST:', process.env.PGHOST);
    console.log('PGUSER:', process.env.PGUSER);
    console.log('PGDATABASE:', process.env.PGDATABASE);
    
    await Database.initialize();
    await Migrations.runAll();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
