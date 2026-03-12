/**
 * Reset Local Database Script
 * 
 * This script drops all tables and re-runs migrations to give you a fresh start.
 * WARNING: This will delete ALL data in your local database!
 * 
 * Usage: node reset-local-db.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function resetDatabase() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL not found in .env file');
    process.exit(1);
  }

  // Safety check - don't run on production
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: Cannot reset database in production environment!');
    process.exit(1);
  }

  // Additional safety check for cloud databases
  if (connectionString.includes('railway.app') || 
      connectionString.includes('heroku.com') ||
      connectionString.includes('amazonaws.com')) {
    console.error('ERROR: This appears to be a cloud database. This script is for local development only!');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });

  try {
    console.log('🔌 Connecting to database...');
    await pool.query('SELECT NOW()');
    console.log('✅ Connected successfully\n');

    console.log('⚠️  WARNING: This will delete ALL data in your database!');
    console.log('Database:', connectionString.split('@')[1] || 'local');
    console.log('\nDropping all tables...');

    // Drop all tables in the public schema
    await pool.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);

    console.log('✅ All tables dropped\n');

    console.log('📦 Running migrations...');

    // Create migrations tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get migration files
    const migrationsDir = path.join(__dirname, 'src/db/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql') && !f.includes('.rollback.'))
      .sort();

    console.log(`Found ${files.length} migration files\n`);

    // Run each migration
    for (const file of files) {
      console.log(`  Running: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`  ✅ Completed: ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`  ❌ Failed: ${file}`);
        throw error;
      } finally {
        client.release();
      }
    }

    console.log('\n✅ Database reset complete!');
    console.log('🎉 You now have a fresh database with all migrations applied\n');

  } catch (error) {
    console.error('\n❌ Error resetting database:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
resetDatabase();
