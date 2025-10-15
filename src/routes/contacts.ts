import { Router } from 'express';
import { Pool } from 'pg';
import { ContactsController, upload, uploadVCF } from '../controllers/contactsController';
import { authMiddleware } from '../middleware/auth';

export function createContactsRoutes(db: Pool): Router {
  const router = Router();
  const contactsController = new ContactsController(db);

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  // CRUD routes
  router.get('/', (req, res) => contactsController.getContacts(req, res));
  router.get('/stats', (req, res) => contactsController.getContactStats(req, res));
  router.get('/:id', (req, res) => contactsController.getContact(req, res));
  router.post('/', (req, res) => contactsController.createContact(req, res));
  router.put('/:id', (req, res) => contactsController.updateContact(req, res));
  router.delete('/:id', (req, res) => contactsController.deleteContact(req, res));

  // CSV Import routes
  router.post('/import-csv/preview', upload.single('csvFile'), (req, res) => contactsController.previewCSV(req, res));
  router.post('/import-csv', upload.single('csvFile'), (req, res) => contactsController.importCSV(req, res));

  // VCF Import routes
  router.post('/import-vcf/preview', uploadVCF.single('vcfFile'), (req, res) => contactsController.previewVCF(req, res));
  router.post('/import-vcf', uploadVCF.single('vcfFile'), (req, res) => contactsController.importVCF(req, res));

  // Phone Contacts Import routes
  router.post('/import-phone', (req, res) => contactsController.importPhoneContacts(req, res));

  // Import and validation routes
  router.post('/import', (req, res) => contactsController.importContacts(req, res));
  
  router.post('/validate', (req, res) => contactsController.validateContact(req, res));

  return router;
}
