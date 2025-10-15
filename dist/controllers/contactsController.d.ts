import { Response } from 'express';
import { Pool } from 'pg';
import multer from 'multer';
import { AuthenticatedRequest } from '../middleware/auth';
declare const upload: multer.Multer;
declare const uploadVCF: multer.Multer;
interface AuthRequestWithFile extends AuthenticatedRequest {
    file?: Express.Multer.File;
}
export declare class ContactsController {
    private contactsService;
    constructor(db: Pool);
    getContacts(req: AuthenticatedRequest, res: Response): Promise<void>;
    getContact(req: AuthenticatedRequest, res: Response): Promise<void>;
    createContact(req: AuthenticatedRequest, res: Response): Promise<void>;
    updateContact(req: AuthenticatedRequest, res: Response): Promise<void>;
    deleteContact(req: AuthenticatedRequest, res: Response): Promise<void>;
    importContacts(req: AuthenticatedRequest, res: Response): Promise<void>;
    getContactStats(req: AuthenticatedRequest, res: Response): Promise<void>;
    validateContact(req: AuthenticatedRequest, res: Response): Promise<void>;
    previewCSV(req: AuthRequestWithFile, res: Response): Promise<void>;
    importCSV(req: AuthRequestWithFile, res: Response): Promise<void>;
    previewVCF(req: AuthRequestWithFile, res: Response): Promise<void>;
    importVCF(req: AuthRequestWithFile, res: Response): Promise<void>;
    importPhoneContacts(req: AuthenticatedRequest, res: Response): Promise<void>;
}
export { upload, uploadVCF };
//# sourceMappingURL=contactsController.d.ts.map