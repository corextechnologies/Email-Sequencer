import { Pool, PoolClient } from 'pg';
export declare class Database {
    private static pool;
    static initialize(): Promise<void>;
    static query(text: string, params?: any[]): Promise<any>;
    static getClient(): Promise<PoolClient>;
    static getPool(): Pool;
    static close(): Promise<void>;
}
//# sourceMappingURL=connection.d.ts.map