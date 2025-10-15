import request from 'supertest';
import express from 'express';
import { Pool } from 'pg';
import { createCampaignRoutes } from '../http/campaignRoutes';

function fakeAuth(req: any, _res: any, next: any) {
	req.user = { userId: 1, email: 'u1@example.com' };
	next();
}

describe('Targeting endpoints', () => {
	function makeApp(db: Pool) {
		const app = express();
		app.use(express.json());
		const router = createCampaignRoutes(db);
		// @ts-ignore
		router.stack[0].handle = fakeAuth;
		app.use('/', router);
		return app;
	}

	it('POST /:id/contacts attaches contacts and ignores duplicates', async () => {
		const db = {
			query: jest.fn().mockImplementation((sql: string, params: any[]) => {
				if (/SELECT 1 FROM campaigns/i.test(sql)) return Promise.resolve({ rowCount: 1 });
				if (/INSERT INTO campaign_contacts/i.test(sql)) return Promise.resolve({ rowCount: 2 });
				throw new Error('Unexpected query');
			})
		} as unknown as Pool;
		const app = makeApp(db);
		const res = await request(app).post('/123/contacts').send({ contact_ids: [1,2,2] });
		expect(res.status).toBe(201);
		expect(res.body.data.inserted).toBe(2);
	});

	it('GET /:id/contacts lists with pagination and search', async () => {
		const db = {
			query: jest.fn().mockImplementation((sql: string) => {
				if (/FROM campaign_contacts cc\s+JOIN campaigns c/i.test(sql) && /LIMIT/i.test(sql)) {
					return Promise.resolve({ rows: [{ campaign_contact_id: 1, status: 'pending', contact_id: 5, first_name: 'A', last_name: 'B', email: 'a@b.com' }] });
				}
				if (/SELECT COUNT\(\*\)::int as total/i.test(sql)) {
					return Promise.resolve({ rows: [{ total: 1 }] });
				}
				throw new Error('Unexpected query');
			})
		} as unknown as Pool;
		const app = makeApp(db);
		const res = await request(app).get('/123/contacts?search=a&page=1&limit=10');
		expect(res.status).toBe(200);
		expect(res.body.total).toBe(1);
		expect(res.body.data[0].status).toBe('pending');
	});

	it('DELETE /:id/contacts/:contactId removes mapping', async () => {
		const db = {
			query: jest.fn().mockImplementation((sql: string) => {
				if (/DELETE FROM campaign_contacts cc USING campaigns c/i.test(sql)) return Promise.resolve({ rowCount: 1 });
				throw new Error('Unexpected query');
			})
		} as unknown as Pool;
		const app = makeApp(db);
		const res = await request(app).delete('/123/contacts/5');
		expect(res.status).toBe(204);
	});
});


