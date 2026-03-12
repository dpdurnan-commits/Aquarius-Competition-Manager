require('dotenv').config();
const { Client } = require('pg');

async function setupTestDatabase() {
  // Connect to the default 'postgres' database first
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Letsdance',
    database: 'postgres' // Connect to default database first
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    // Check if database exists
    const checkDb = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'competition_account_test'"
    );

    if (checkDb.rows.length === 0) {
      // Create the database
      await client.query('CREATE DATABASE competition_account_test');
      console.log('✓ Database "competition_account_test" created successfully!');
    } else {
      console.log('✓ Database "competition_account_test" already exists');
    }

    await client.end();
    console.log('\nSetup complete! You can now run the tests.');
  } catch (error) {
    console.error('Error setting up database:', error.message);
    console.error('\nPlease check your database credentials in the .env file');
    process.exit(1);
  }
}

setupTestDatabase();
