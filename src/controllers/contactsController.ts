import { Request, Response } from 'express';
import { Pool } from 'pg';
import multer from 'multer';
import { ContactsService } from '../services/contactsService';
import { AuthenticatedRequest } from '../middleware/auth';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Configure multer for VCF file uploads
const uploadVCF = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/vcard' || file.originalname.endsWith('.vcf')) {
      cb(null, true);
    } else {
      cb(new Error('Only VCF files are allowed'));
    }
  }
});

interface AuthRequestWithFile extends AuthenticatedRequest {
  file?: Express.Multer.File;
}

export class ContactsController {
  private contactsService: ContactsService;

  constructor(db: Pool) {
    this.contactsService = new ContactsService(db);
  }

  // GET /api/contacts - Get contacts list with filtering
  async getContacts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const queryParams = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
        search: req.query.search as string,
        status: req.query.status as string,
        source: req.query.source as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        sort: (req.query.sort as string || 'created_at') as 'created_at' | 'name' | 'email' | 'updated_at',
        order: (req.query.order as string || 'desc') as 'asc' | 'desc'
      };

      const result = await this.contactsService.getContacts(userId, queryParams);
      res.json(result);

    } catch (error) {
      console.error('Get contacts error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch contacts',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/contacts/:id - Get single contact
  async getContact(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const contactId = parseInt(req.params.id);

      if (isNaN(contactId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid contact ID'
        });
        return;
      }

      const contact = await this.contactsService.getContact(userId, contactId);
      
      if (!contact) {
        res.status(404).json({
          success: false,
          message: 'Contact not found'
        });
        return;
      }

      res.json({
        success: true,
        contact
      });

    } catch (error) {
      console.error('Get contact error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch contact',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/contacts - Create new contact
  async createContact(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const contactData = req.body;

      // Validate required fields
      if (!contactData.email) {
        res.status(400).json({
          success: false,
          message: 'Email is required'
        });
        return;
      }

      // Check for duplicate
      const existing = await this.contactsService.checkDuplicate(userId, contactData.email);
      if (existing) {
        res.status(409).json({
          success: false,
          message: 'Contact with this email already exists',
          existing_contact: existing
        });
        return;
      }

      const contact = await this.contactsService.createContact(userId, contactData);
      
      res.status(201).json({
        success: true,
        message: 'Contact created successfully',
        contact
      });

    } catch (error) {
      console.error('Create contact error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create contact',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // PUT /api/contacts/:id - Update contact
  async updateContact(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const contactId = parseInt(req.params.id);
      const updateData = req.body;

      if (isNaN(contactId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid contact ID'
        });
        return;
      }

      // Check if contact exists and belongs to user
      const existingContact = await this.contactsService.getContact(userId, contactId);
      if (!existingContact) {
        res.status(404).json({
          success: false,
          message: 'Contact not found'
        });
        return;
      }

      // Check for email conflict if email is being updated
      if (updateData.email && updateData.email !== existingContact.email) {
        const duplicate = await this.contactsService.checkDuplicate(userId, updateData.email);
        if (duplicate) {
          res.status(409).json({
            success: false,
            message: 'Another contact with this email already exists'
          });
          return;
        }
      }

      const updatedContact = await this.contactsService.updateContact(userId, contactId, updateData);
      
      res.json({
        success: true,
        message: 'Contact updated successfully',
        contact: updatedContact
      });

    } catch (error) {
      console.error('Update contact error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update contact',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // DELETE /api/contacts/:id - Delete contact
  async deleteContact(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const contactId = parseInt(req.params.id);

      if (isNaN(contactId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid contact ID'
        });
        return;
      }

      const deleted = await this.contactsService.deleteContact(userId, contactId);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Contact not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Contact deleted successfully'
      });

    } catch (error) {
      console.error('Delete contact error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to delete contact',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/contacts/import - Import contacts from various sources
  async importContacts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const importData = req.body;

      // Validate import data
      if (!importData.contacts || !Array.isArray(importData.contacts)) {
        res.status(400).json({
          success: false,
          message: 'Invalid import data - contacts array is required'
        });
        return;
      }

      if (importData.contacts.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No contacts to import'
        });
        return;
      }

      if (importData.contacts.length > 1000) {
        res.status(400).json({
          success: false,
          message: 'Maximum 1000 contacts per import'
        });
        return;
      }

      const result = await this.contactsService.importContacts(userId, importData);
      
      res.json({
        success: true,
        message: `Import completed: ${result.imported} imported, ${result.skipped} skipped, ${result.errors} errors, ${result.duplicates} duplicates`,
        result
      });

    } catch (error) {
      console.error('Import contacts error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to import contacts',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/contacts/stats - Get contact statistics
  async getContactStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const stats = await this.contactsService.getContactStats(userId);
      
      res.json({
        success: true,
        stats
      });

    } catch (error) {
      console.error('Get contact stats error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch contact statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }


  // POST /api/contacts/validate - Validate contact data
  async validateContact(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const contactData = req.body;
      const validation = this.contactsService.validateContact(contactData);
      
      res.json({
        success: true,
        validation
      });

    } catch (error) {
      console.error('Validate contact error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to validate contact',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/contacts/import-csv/preview - Preview CSV file
  async previewCSV(req: AuthRequestWithFile, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No CSV file uploaded' });
        return;
      }
      
      const csvBuffer = req.file.buffer;
      const result = await this.contactsService.previewCSV(csvBuffer);
      
      res.status(200).json(result);
    } catch (error) {
      console.error('CSV preview error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to preview CSV file'
      });
    }
  }

  // POST /api/contacts/import-csv - Import CSV file
  async importCSV(req: AuthRequestWithFile, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No CSV file uploaded' });
        return;
      }
      
      const userId = req.user!.userId;
      const csvBuffer = req.file.buffer;
      
      const result = await this.contactsService.importFromCSV(userId, csvBuffer);
      
      res.status(200).json({
        message: 'CSV import completed',
        results: result
      });
    } catch (error) {
      console.error('CSV import error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to import CSV'
      });
    }
  }

  // POST /api/contacts/import-vcf/preview - Preview VCF file
  async previewVCF(req: AuthRequestWithFile, res: Response): Promise<void> {
    try {
      console.log('VCF preview endpoint not fully implemented yet');
      
      if (!req.file) {
        res.status(400).json({ error: 'No VCF file uploaded' });
        return;
      }
      
      const vcfBuffer = req.file.buffer;
      const result = await this.contactsService.previewVCF(vcfBuffer);
      
      res.status(200).json(result);
    } catch (error) {
      console.error('VCF preview error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to preview VCF file'
      });
    }
  }

  // POST /api/contacts/import-vcf - Import VCF file
  async importVCF(req: AuthRequestWithFile, res: Response): Promise<void> {
    try {
      console.log('VCF import endpoint not fully implemented yet');
      
      if (!req.file) {
        res.status(400).json({ error: 'No VCF file uploaded' });
        return;
      }
      
      const userId = req.user!.userId;
      const vcfBuffer = req.file.buffer;
      
      const result = await this.contactsService.importFromVCF(userId, vcfBuffer);
      
      res.status(200).json({
        message: 'VCF import completed',
        results: result
      });
    } catch (error) {
      console.error('VCF import error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to import VCF'
      });
    }
  }

  // POST /api/contacts/import-phone - Import phone contacts
  async importPhoneContacts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      console.log('Phone contacts import endpoint not fully implemented yet');
      
      const userId = req.user!.userId;
      const { contacts } = req.body;

      if (!contacts || !Array.isArray(contacts)) {
        res.status(400).json({ 
          error: 'Invalid request - contacts array is required' 
        });
        return;
      }

      if (contacts.length === 0) {
        res.status(400).json({ 
          error: 'No contacts provided' 
        });
        return;
      }

      if (contacts.length > 1000) {
        res.status(400).json({ 
          error: 'Maximum 1000 contacts per import' 
        });
        return;
      }

      console.log(`Processing ${contacts.length} phone contacts for user ${userId}`);

      const result = await this.contactsService.importPhoneContacts(userId, contacts);
      
      res.status(200).json({
        message: 'Phone contacts import completed',
        results: result
      });
    } catch (error) {
      console.error('Phone contacts import error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to import phone contacts'
      });
    }
  }
}

// Export multer upload middleware
export { upload, uploadVCF };
