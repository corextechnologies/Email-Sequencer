import { createCampaignSchema, updateCampaignStatusSchema } from '../validators';

describe('campaign validators', () => {
	it('validates create schema', () => {
		const parsed = createCampaignSchema.safeParse({ name: 'Test' });
		expect(parsed.success).toBe(true);
		expect((parsed as any).data.timezone).toBeDefined();
	});

	it('rejects invalid status', () => {
		const parsed = updateCampaignStatusSchema.safeParse({ status: 'foo' });
		expect(parsed.success).toBe(false);
	});
});


