import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare class ProfileController {
    static getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static changeEmail(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=profileController.d.ts.map