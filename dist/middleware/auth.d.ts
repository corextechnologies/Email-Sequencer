import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from '../types';
export interface AuthenticatedRequest extends Request {
    user?: JwtPayload;
}
export declare function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map