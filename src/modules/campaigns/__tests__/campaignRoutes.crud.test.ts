import request from 'supertest';
import express from 'express';
import { Pool } from 'pg';
import { createCampaignRoutes } from '../http/campaignRoutes';

function fakeAuth(req: any, _res: any, next: any) {
	req.user = { userId: 1, email: 'u1@example.com' };
	next();
}

describe('Campaigns CRUD ownership (supertest)', () => {
	function makeApp(db: Pool) {
		const app = express();
		app.use(express.json());
		const router = createCampaignRoutes(db);
		// inject fake auth
		// @ts-ignore
		router.stack[0].handle = fakeAuth;
		app.use('/', router);
		return app;
	}

	it('POST / creates draft campaign for owner', async () => {
		const db = {
			query: jest.fn().mockImplementation((sql: string, params: any[]) => {
				if (/INSERT INTO campaigns/i.test(sql)) {
					return Promise.resolve({ rows: [{ id: 10, user_id: params[0], name: params[1], status: 'draft', timezone: params[2], send_window_start: '09:00:00', send_window_end: '17:00:00', created_at: '', updated_at: '' }] });
				}
				throw new Error('Unexpected query');
			})
		} as unknown as Pool;
		const app = makeApp(db);
		const res = await request(app).post('/').send({ name: 'A' });
		expect(res.status).toBe(201);
		expect(res.body.data.status).toBe('draft');
		expect(res.body.data.user_id).toBe(1);
	});

	it('GET /:id returns 404 for non-owner', async () => {
		const db = {
			query: jest.fn().mockImplementation((sql: string) => {
				if (/FROM campaigns WHERE id = \$1 AND user_id = \$2/i.test(sql)) {
					return Promise.resolve({ rows: [] });
				}
				throw new Error('Unexpected query');
			})
		} as unknown as Pool;
		const app = makeApp(db);
		const res = await request(app).get('/123');
		expect(res.status).toBe(404);
	});

	it('PUT /:id updates only owner campaign', async () => {
		const db = {
			query: jest.fn().mockImplementation((sql: string) => {
				if (/UPDATE campaigns SET/i.test(sql)) {
					return Promise.resolve({ rows: [{ id: 5, user_id: 1, name: 'B', status: 'draft', timezone: 'UTC', send_window_start: '09:00:00', send_window_end: '17:00:00', created_at: '', updated_at: '' }] });
				}
				throw new Error('Unexpected query');
			})
		} as unknown as Pool;
		const app = makeApp(db);
		const res = await request(app).put('/5').send({ name: 'B' });
		expect(res.status).toBe(200);
		expect(res.body.data.name).toBe('B');
	});

	it('DELETE /:id enforces status draft|paused and ownership', async () => {
		const db = {
			query: jest.fn().mockImplementation((sql: string, params: any[]) => {
				if (/SELECT status FROM campaigns/i.test(sql)) {
					// return draft to allow delete
					return Promise.resolve({ rowCount: 1, rows: [{ status: 'draft' }] });
				}
				if (/DELETE FROM campaigns/i.test(sql)) {
					return Promise.resolve({ rowCount: 1 });
				}
				throw new Error('Unexpected query');
			})
		} as unknown as Pool;
		const app = makeApp(db);
		const res = await request(app).delete('/9');
		expect(res.status).toBe(204);
	});

	it('DELETE /:id returns 400 when not draft|paused', async () => {
		const db = {
			query: jest.fn().mockImplementation((sql: string) => {
				if (/SELECT status FROM campaigns/i.test(sql)) {
					return Promise.resolve({ rowCount: 1, rows: [{ status: 'ready' }] });
				}
				throw new Error('Unexpected query');
			})
		} as unknown as Pool;
		const app = makeApp(db);
		const res = await request(app).delete('/7');
		expect(res.status).toBe(400);
	});
});


