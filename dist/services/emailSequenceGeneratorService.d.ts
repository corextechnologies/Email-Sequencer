export interface SequenceParams {
    numberOfEmails: number;
    schedule: string[];
    primaryGoal: string;
}
export interface EmailInSequence {
    email_number: number;
    day: number;
    subject_lines: string[];
    preview_text: string;
    email_body: string;
    reply_trigger: string;
    potential_objection: string;
    follow_up_angle: string;
}
export interface EmailSequenceResult {
    email_sequence: EmailInSequence[];
}
export declare function generateEmailSequenceForContact(userId: number, contactId: string, provider: string, apiKey: string, sequenceParams: SequenceParams): Promise<EmailSequenceResult | {
    error: string;
}>;
//# sourceMappingURL=emailSequenceGeneratorService.d.ts.map