/**
 * Verify Database Schema
 * 
 * Quick script to verify the database schema is correct after reset
 */

const { Pool } = require('pg');
require('dotenv').config();

async function verifySchema() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('🔍 Verifying database schema...\n');

    // Check tables exist
    const tables = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);

    console.log('📋 Tables found:');
    tables.rows.forEach(row => console.log(`  ✓ ${row.tablename}`));
    console.log('');

    // Check competition_results structure
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'competition_results'
      ORDER BY ordinal_position
    `);

    console.log('📊 competition_results columns:');
    columns.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    console.log('');

    // Count records
    const counts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM transactions) as transactions,
        (SELECT COUNT(*) FROM competitions) as competitions,
        (SELECT COUNT(*) FROM competition_results) as results,
        (SELECT COUNT(*) FROM flagged_transactions) as flagged,
        (SELECT COUNT(*) FROM presentation_seasons) as seasons
    `);

    console.log('📈 Record counts:');
    const count = counts.rows[0];
    console.log(`  Transactions: ${count.transactions}`);
    console.log(`  Competitions: ${count.competitions}`);
    console.log(`  Competition Results: ${count.results}`);
    console.log(`  Flagged Transactions: ${count.flagged}`);
    console.log(`  Presentation Seasons: ${count.seasons}`);
    console.log('');

    console.log('✅ Schema verification complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifySchema();
