import { Pool } from 'pg';
export declare class ContactTargetService {
    private repo;
    constructor(db: Pool);
    attach(userId: number, campaignId: number, input: unknown): Promise<number>;
    list(userId: number, campaignId: number, query: Record<string, unknown>): Promise<{
        data: any[];
        total: number;
        page: number;
        limit: number;
    }>;
    remove(userId: number, campaignId: number, contactId: number): Promise<boolean>;
    updatePersona(userId: number, campaignId: number, contactId: number, personaId: string | null): Promise<any>;
}
//# sourceMappingURL=contactTargetService.d.ts.map