export declare class Migrations {
    static createUsersTable(): Promise<void>;
    static createEmailAccountsTable(): Promise<void>;
    static createContactsTable(): Promise<void>;
    static runAll(): Promise<void>;
    /**
     * Create all Campaigns module tables, constraints, indexes, and triggers.
     */
    static createCampaignsModule(): Promise<void>;
    /** Jobs queue (postgres-backed) */
    static createJobsModule(): Promise<void>;
    /**
     * Create LLM settings and prompt library tables.
     */
    static createLLMModule(): Promise<void>;
    /**
     * Create personas table for storing detailed persona information.
     */
    static createPersonasTable(): Promise<void>;
    static createEnrichedDataTable(): Promise<void>;
    static createCampaignEmailsTable(): Promise<void>;
    /**
     * Add sequence progress tracking fields to campaign_contacts
     */
    static addSequenceProgressFields(): Promise<void>;
    /**
     * Add sequence_started_at field to campaign_contacts for accurate day calculations
     */
    static addSequenceStartedAt(): Promise<void>;
    /**
     * Add email opens tracking table and fields
     */
    static addEmailOpensTracking(): Promise<void>;
}
//# sourceMappingURL=migrations.d.ts.map