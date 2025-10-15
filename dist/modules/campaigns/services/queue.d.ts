import { Pool } from 'pg';
export declare class JobQueue {
    private db;
    constructor(db: Pool);
    enqueue(queue: 'schedule-campaign' | 'send-email', payload: any, opts?: {
        runAt?: Date;
        idempotencyKey?: string;
        maxAttempts?: number;
    }): Promise<void>;
    fetchNext(queue: string): Promise<any | null>;
    complete(id: number): Promise<void>;
    fail(id: number, backoffSeconds: number): Promise<void>;
}
//# sourceMappingURL=queue.d.ts.map