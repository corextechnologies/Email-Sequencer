import request from 'supertest';
import express from 'express';
import { Pool } from 'pg';
import { createCampaignRoutes } from '../http/campaignRoutes';

// Minimal auth middleware stub to inject user
function fakeAuth(req: any, _res: any, next: any) {
	req.user = { userId: 1, email: 'test@example.com' };
	next();
}

describe('Campaign routes', () => {
	it('GET / should list campaigns', async () => {
		const app = express();
		app.use(express.json());
		const db = {
			query: jest.fn().mockResolvedValue({ rows: [] })
		} as unknown as Pool;

		// Patch router to skip real auth
		const router = createCampaignRoutes(db);
		// @ts-ignore private API for test: replace first middleware with fake
		router.stack[0].handle = fakeAuth;
		app.use('/', router);

		const res = await request(app).get('/');
		expect(res.status).toBe(200);
		expect(res.body.success).toBe(true);
		expect(Array.isArray(res.body.data)).toBe(true);
	});
});


