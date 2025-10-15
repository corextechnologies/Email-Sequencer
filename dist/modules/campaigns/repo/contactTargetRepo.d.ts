import { Pool } from 'pg';
export declare class ContactTargetRepo {
    private db;
    constructor(db: Pool);
    upsertContacts(userId: number, campaignId: number, contactIds: number[]): Promise<number>;
    listContacts(userId: number, campaignId: number, search: string, page: number, limit: number): Promise<{
        data: any[];
        total: number;
        page: number;
        limit: number;
    }>;
    deleteContact(userId: number, campaignId: number, contactId: number): Promise<boolean>;
    updatePersona(userId: number, campaignId: number, contactId: number, personaId: string | null): Promise<any>;
}
//# sourceMappingURL=contactTargetRepo.d.ts.map