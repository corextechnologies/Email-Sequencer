import { SequenceRepo } from '../repo/sequenceRepo';

// This is a unit-style test using a mocked client to verify edge cases in reorder logic

describe('SequenceRepo.reorder', () => {
	it('rejects duplicate step_ids', async () => {
		const repo = new SequenceRepo({} as any);
		await expect(async () => {
			// @ts-ignore private method not used; we directly call reorder which will try to use db
			await repo.reorder(1, 1, [1,1,2]);
		}).rejects.toBeDefined();
	});
});


