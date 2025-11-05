import { Request, Response, NextFunction } from 'express';
interface VersionRequest extends Request {
    version?: string;
}
/**
 * Middleware to check if the client app version meets minimum requirements
 * Phase 2: Blocks outdated versions when enforcement is enabled
 */
export declare function versionCheckMiddleware(req: VersionRequest, res: Response, next: NextFunction): void;
export {};
//# sourceMappingURL=versionCheck.d.ts.map