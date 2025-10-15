import { Pool } from 'pg';

export class JobQueue {
	constructor(private db: Pool) {}

	async enqueue(queue: 'schedule-campaign' | 'send-email', payload: any, opts?: { runAt?: Date; idempotencyKey?: string; maxAttempts?: number }) {
		// Use NOW() for immediate execution, or convert Date to ISO string for PostgreSQL
		let runAtValue;
		if (opts?.runAt) {
			// Convert to ISO string to ensure proper UTC handling by PostgreSQL
			runAtValue = opts.runAt.toISOString();
		} else {
			// Use PostgreSQL's NOW() function for immediate execution
			runAtValue = new Date().toISOString();
		}
		
		await this.db.query(
			`INSERT INTO jobs (queue, payload, run_at, idempotency_key, max_attempts)
			 VALUES ($1, $2, $3::timestamptz, $4, $5)
			 ON CONFLICT (idempotency_key) DO NOTHING`,
			[queue, payload, runAtValue, opts?.idempotencyKey ?? null, opts?.maxAttempts ?? 5]
		);
	}

	async fetchNext(queue: string): Promise<any | null> {
		const client = await this.db.connect();
		try {
			await client.query('BEGIN');
			const result = await client.query(
				`UPDATE jobs SET status='running'
				 WHERE id IN (
					SELECT id FROM jobs WHERE queue = $1 AND status='pending' AND run_at <= NOW()
					ORDER BY run_at ASC
					FOR UPDATE SKIP LOCKED LIMIT 1
				)
				RETURNING *`,
				[queue]
			);
			await client.query('COMMIT');
			return result.rows[0] || null;
		} catch (e) {
			await client.query('ROLLBACK');
			throw e;
		} finally {
			client.release();
		}
	}

	async complete(id: number) {
		await this.db.query(`UPDATE jobs SET status='completed' WHERE id = $1`, [id]);
	}

	async fail(id: number, backoffSeconds: number) {
		await this.db.query(`UPDATE jobs SET status='pending', attempts = attempts + 1, run_at = NOW() + ($1 || ' seconds')::interval WHERE id = $2`, [String(backoffSeconds), id]);
	}
}


