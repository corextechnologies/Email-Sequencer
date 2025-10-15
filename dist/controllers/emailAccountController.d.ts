import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare class EmailAccountController {
    static createEmailAccount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static getEmailAccounts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static getEmailAccount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static updateEmailAccount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static deleteEmailAccount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static toggleEmailAccountStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=emailAccountController.d.ts.map