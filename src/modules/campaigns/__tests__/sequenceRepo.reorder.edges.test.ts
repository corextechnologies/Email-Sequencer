import { SequenceRepo } from '../repo/sequenceRepo';

type QueryHandler = (sql: string, params?: any[]) => any;

function makeFakePool(handler: QueryHandler): any {
	return {
		connect: async () => ({
			release: () => {},
			query: async (sql: string, params?: any[]) => handler(sql, params)
		})
	};
}

describe('SequenceRepo.reorder edge cases', () => {
	it('throws when campaign is running', async () => {
		const handler: QueryHandler = (sql) => {
			if (/SELECT status FROM campaigns/i.test(sql)) {
				return { rowCount: 1, rows: [{ status: 'running' }] };
			}
			if (/BEGIN|COMMIT|ROLLBACK/i.test(sql)) return {};
			throw new Error('Unexpected query');
		};
		const repo = new SequenceRepo(makeFakePool(handler));
		await expect(repo.reorder(1, 1, [1,2])).rejects.toThrow('CAMPAIGN_RUNNING');
	});

	it('throws when step_ids include non-campaign step', async () => {
		const handler: QueryHandler = (sql) => {
			if (/SELECT status FROM campaigns/i.test(sql)) {
				return { rowCount: 1, rows: [{ status: 'paused' }] };
			}
			if (/SELECT id FROM sequence_steps WHERE campaign_id = \$1$/i.test(sql)) {
				return { rowCount: 3, rows: [{ id: 1 }, { id: 2 }, { id: 3 }] };
			}
			if (/BEGIN|COMMIT|ROLLBACK/i.test(sql)) return {};
			throw new Error('Unexpected query');
		};
		const repo = new SequenceRepo(makeFakePool(handler));
		await expect(repo.reorder(1, 1, [2,4])).rejects.toThrow('INVALID_STEP_IDS');
	});

	it('returns contiguous indices starting at 0 in final result', async () => {
		const finalOrder: number[] = [];
		const handler: QueryHandler = (sql, params) => {
			if (/BEGIN|COMMIT|ROLLBACK/i.test(sql)) return {};
			if (/SELECT status FROM campaigns/i.test(sql)) {
				return { rowCount: 1, rows: [{ status: 'paused' }] };
			}
			if (/SELECT id FROM sequence_steps WHERE campaign_id = \$1$/i.test(sql)) {
				return { rowCount: 3, rows: [{ id: 1 }, { id: 2 }, { id: 3 }] };
			}
			if (/UPDATE sequence_steps SET step_index = \$1 WHERE id = \$2/i.test(sql)) {
				// Capture updates but no-op
				return { rowCount: 1 };
			}
			if (/SELECT id FROM sequence_steps WHERE campaign_id = \$1 AND id <> ALL\(\$2::int\[\]\)/i.test(sql)) {
				// remaining ids not in provided list
				const provided = params?.[1] as number[];
				const remaining = [1,2,3].filter((id) => !provided.includes(id));
				return { rowCount: remaining.length, rows: remaining.map((id) => ({ id })) };
			}
			if (/SELECT id, campaign_id, step_index[\s\S]*FROM sequence_steps WHERE campaign_id = \$1 ORDER BY step_index ASC/i.test(sql)) {
				// Build final ordered rows from [2,1] + remaining [3]
				const ordered = [2,1,3];
				finalOrder.push(...ordered);
				return {
					rowCount: 3,
					rows: ordered.map((id, idx) => ({ id, campaign_id: 1, step_index: idx, delay_hours: idx, from_email_account_id: null, subject_template: '', body_template: '', prompt_key: null, enabled: true, created_at: '', updated_at: '' }))
				};
			}
			throw new Error('Unexpected query');
		};
		const repo = new SequenceRepo(makeFakePool(handler));
		const result = await repo.reorder(1, 1, [2,1]);
		expect(result.map((r) => r.step_index)).toEqual([0,1,2]);
		expect(result.map((r) => r.id)).toEqual([2,1,3]);
	});
});


