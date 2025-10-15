import { Pool } from 'pg';
import { Contact, CreateContactRequest, UpdateContactRequest, ContactsListRequest, ContactsListResponse, ImportContactData, ImportValidationResult, ImportRequest, ImportResponse } from '../types/contacts';
export declare class ContactsService {
    private db;
    constructor(db: Pool);
    createContact(userId: number, data: CreateContactRequest): Promise<Contact>;
    getContacts(userId: number, params: ContactsListRequest): Promise<ContactsListResponse>;
    getContact(userId: number, contactId: number): Promise<Contact | null>;
    updateContact(userId: number, contactId: number, data: UpdateContactRequest): Promise<Contact | null>;
    deleteContact(userId: number, contactId: number): Promise<boolean>;
    validateContact(data: ImportContactData): ImportValidationResult;
    checkDuplicate(userId: number, email: string): Promise<Contact | null>;
    importContacts(userId: number, importData: ImportRequest): Promise<ImportResponse>;
    importFromCSV(userId: number, csvData: Buffer): Promise<{
        success: number;
        failed: number;
        duplicates: number;
        errors: Array<{
            row: number;
            error: string;
            data: any;
        }>;
    }>;
    previewCSV(csvData: Buffer): Promise<{
        preview: any[];
        totalRows: number;
        columns: string[];
    }>;
    private validateCSVRow;
    private findFieldValue;
    private isValidEmail;
    findByEmail(userId: number, email: string): Promise<Contact | null>;
    getContactStats(userId: number): Promise<any>;
    previewVCF(vcfData: Buffer): Promise<{
        contacts: any[];
        totalContacts: number;
        supportedFields: string[];
    }>;
    importFromVCF(userId: number, vcfData: Buffer): Promise<{
        success: number;
        failed: number;
        duplicates: number;
        errors: Array<{
            row: number;
            error: string;
            data: any;
        }>;
    }>;
    private parseVCFContent;
    private convertVCFToContact;
    importPhoneContacts(userId: number, contacts: any[]): Promise<{
        success: number;
        failed: number;
        duplicates: number;
        errors: Array<{
            row: number;
            error: string;
            data: any;
        }>;
    }>;
}
//# sourceMappingURL=contactsService.d.ts.map