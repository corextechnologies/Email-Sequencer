import { EmailAccount, CreateEmailAccountRequest, EmailAccountResponse } from '../types';
export declare class EmailAccountService {
    static createEmailAccount(userId: number, accountData: CreateEmailAccountRequest): Promise<EmailAccountResponse>;
    static getUserEmailAccounts(userId: number): Promise<EmailAccountResponse[]>;
    static getEmailAccountById(accountId: number, userId: number): Promise<EmailAccountResponse | null>;
    static getEmailAccountWithPassword(accountId: number, userId: number): Promise<EmailAccount | null>;
    static updateEmailAccount(accountId: number, userId: number, updateData: Partial<CreateEmailAccountRequest>): Promise<EmailAccountResponse | null>;
    static deleteEmailAccount(accountId: number, userId: number): Promise<boolean>;
    static toggleEmailAccountStatus(accountId: number, userId: number): Promise<EmailAccountResponse | null>;
}
//# sourceMappingURL=emailAccountService.d.ts.map