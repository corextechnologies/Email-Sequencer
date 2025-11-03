import { Request, Response, NextFunction } from 'express';
interface VersionRequest extends Request {
    version?: string;
}
/**
 * Middleware to check if the client app version meets minimum requirements
 * Currently in monitoring mode (Phase 1) - logs versions but doesn't block
 */
export declare function versionCheckMiddleware(req: VersionRequest, res: Response, next: NextFunction): void;
export {};
//# sourceMappingURL=versionCheck.d.ts.map