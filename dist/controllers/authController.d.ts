import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare class AuthController {
    static register(req: Request, res: Response, next: NextFunction): Promise<void>;
    static login(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void>;
    static resetPassword(req: Request, res: Response, next: NextFunction): Promise<void>;
    static sendRegistrationOTP(req: Request, res: Response, next: NextFunction): Promise<void>;
    static verifyRegistrationOTP(req: Request, res: Response, next: NextFunction): Promise<void>;
    static resendRegistrationOTP(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=authController.d.ts.map