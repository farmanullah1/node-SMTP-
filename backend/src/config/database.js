import "dotenv/config";
import { Sequelize } from 'sequelize';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const sql = require('mssql/msnodesqlv8');

const server = process.env.SERVER || 'localhost';
const database = process.env.DATABASE || 'somenewdatabase';

// ODBC Driver 18 connection strings with Windows Authentication (Trusted_Connection=Yes)
const masterConnectionString =
  `Driver={ODBC Driver 18 for SQL Server};` +
  `Server=${server};` +
  `Database=master;` +
  `Trusted_Connection=Yes;` +
  `TrustServerCertificate=Yes;`;

const targetConnectionString =
  `Driver={ODBC Driver 18 for SQL Server};` +
  `Server=${server};` +
  `Database=${database};` +
  `Trusted_Connection=Yes;` +
  `TrustServerCertificate=Yes;`;

// Configure Sequelize using msnodesqlv8 dialect with connection pooling
const sequelize = new Sequelize({
  dialect: 'mssql',
  dialectModule: require('msnodesqlv8/lib/sequelize'),
  dialectOptions: {
    options: {
      connectionString: targetConnectionString,
    },
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  logging: process.env.NODE_ENV === 'development' ? (msg) => {
    // Only log essential SQL commands in dev mode to reduce noise
    if (msg.includes('Executing (default): SELECT 1+1') || msg.includes('sys.databases')) return;
    console.log(`[Sequelize SQL] ${msg}`);
  } : false,
});

/**
 * Connects to master database using safe parameterized query and ensures
 * the target database exists.
 */
async function ensureDatabaseExists() {
  let masterPool;
  try {
    masterPool = await sql.connect({ connectionString: masterConnectionString });
    
    // Parameterized lookup to avoid SQL injection
    const req = masterPool.request();
    req.input('dbName', sql.NVarChar, database);
    const result = await req.query('SELECT 1 FROM sys.databases WHERE name = @dbName');

    if (result.recordset.length === 0) {
      console.log(`[DB] Database '${database}' not found on server '${server}'. Creating...`);
      const safeDbName = database.replace(/\]/g, ']]');
      await masterPool.request().query(`CREATE DATABASE [${safeDbName}]`);
      console.log(`[DB] Database '${database}' created successfully.`);
    } else {
      console.log(`[DB] Database '${database}' verified.`);
    }
  } catch (err) {
    console.warn(`[DB Warning] Failed verifying/creating database '${database}' on master:`, err.message);
  } finally {
    if (masterPool) {
      await masterPool.close().catch(() => {});
    }
  }
}

let isConnected = false;

/**
 * Verifies and connects to SQL Server via Sequelize ORM.
 */
async function connectToDatabase() {
  if (isConnected) {
    return sequelize;
  }

  try {
    await ensureDatabaseExists();

    await sequelize.authenticate();
    console.log(`[DB] Connected to target database '${database}' successfully via Sequelize ORM`);
    isConnected = true;

    try {
      const { initModels } = await import('../models/index.js');
      if (typeof initModels === 'function') {
        await initModels();
      }
    } catch (err) {
      if (err.code !== 'ERR_MODULE_NOT_FOUND') {
        console.warn('[DB] Note on models init:', err.message);
      }
    }

    return sequelize;
  } catch (error) {
    console.error('[DB Fatal] Sequelize database connection/setup failed:', error);
    throw error;
  }
}

/**
 * Executes a probe query to verify live database health and measure latency.
 * @returns {Promise<{ healthy: boolean, latencyMs: number, database: string, error?: string }>}
 */
async function checkDatabaseHealth() {
  const start = Date.now();
  try {
    await sequelize.query('SELECT 1 AS health_check');
    return {
      healthy: true,
      latencyMs: Date.now() - start,
      database,
      server,
    };
  } catch (error) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      database,
      server,
      error: error.message,
    };
  }
}

async function getPool() {
  await connectToDatabase();
  return sequelize;
}

export { sequelize, connectToDatabase, getPool, checkDatabaseHealth };
