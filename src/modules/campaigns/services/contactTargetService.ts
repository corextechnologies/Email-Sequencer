import { Pool } from 'pg';
import { ContactTargetRepo } from '../repo/contactTargetRepo';
import { attachContactsSchema, listContactsQuerySchema } from '../validators';

export class ContactTargetService {
	private repo: ContactTargetRepo;

	constructor(db: Pool) {
		this.repo = new ContactTargetRepo(db);
	}

	async attach(userId: number, campaignId: number, input: unknown): Promise<number> {
		const parsed = attachContactsSchema.parse(input);
		const uniqueIds = Array.from(new Set<number>(parsed.contact_ids));
		return this.repo.upsertContacts(userId, campaignId, uniqueIds);
	}

	async list(userId: number, campaignId: number, query: Record<string, unknown>): Promise<{ data: any[]; total: number; page: number; limit: number; }>{
		const { search, page, limit } = listContactsQuerySchema.parse(query);
		return this.repo.listContacts(userId, campaignId, search, page, limit);
	}

	async remove(userId: number, campaignId: number, contactId: number): Promise<boolean> {
		return this.repo.deleteContact(userId, campaignId, contactId);
	}

	async updatePersona(userId: number, campaignId: number, contactId: number, personaId: string | null): Promise<any> {
		return this.repo.updatePersona(userId, campaignId, contactId, personaId);
	}
}


