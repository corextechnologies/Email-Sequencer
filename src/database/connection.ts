import { Pool, PoolClient } from 'pg';

export class Database {
  private static pool: Pool;

  static async initialize(): Promise<void> {
    if (this.pool) {
      return;
    }

    // Use the direct connection string for better compatibility
    const connectionString = process.env.DATABASE_URL;
    
    if (connectionString) {
      this.pool = new Pool({
        connectionString,
        // Ensure SSL for hosts like Neon; safe for local too
        ssl: { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 0,
      });
    } else {
      this.pool = new Pool({
        host: process.env.PGHOST,
        port: parseInt(process.env.PGPORT || '5432'),
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        ssl: { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 0,
      });
    }

    // Test connection
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
    } catch (error) {
      throw new Error(`Database connection failed: ${error}`);
    }
  }

  static async query(text: string, params?: any[]): Promise<any> {
    if (!this.pool) {
      throw new Error('Database not initialized. Call Database.initialize() first.');
    }

    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  static async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database not initialized. Call Database.initialize() first.');
    }
    return this.pool.connect();
  }

  static getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database not initialized. Call Database.initialize() first.');
    }
    return this.pool;
  }

  static async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }
}
