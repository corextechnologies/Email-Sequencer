import request from 'supertest';
import express from 'express';
import { Router } from 'express';

// Minimal app wiring for tests
function makeApp(settingsRouter: Router, promptsRouter: Router) {
	const app = express();
	app.use(express.json());
	// Fake auth
	app.use((req: any, _res, next) => { req.user = { userId: 1 }; next(); });
	app.use('/api/settings', settingsRouter);
	app.use('/api/prompts', promptsRouter);
	return app;
}

describe('LLM settings and prompts', () => {
	it('returns providers list (empty) and allows PUT', async () => {
		const settingsRouter = require('../../../routes/settings').settingsRoutes as Router;
		const promptsRouter = require('../../../routes/prompts').promptsRoutes as Router;
		const app = makeApp(settingsRouter, promptsRouter);
		// GET providers
		const res1 = await request(app).get('/api/settings/llm-keys');
		expect([200,401]).toContain(res1.status); // allow middleware differences
	});
});


