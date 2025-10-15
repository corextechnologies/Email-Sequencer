"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContactsRoutes = createContactsRoutes;
const express_1 = require("express");
const contactsController_1 = require("../controllers/contactsController");
const auth_1 = require("../middleware/auth");
function createContactsRoutes(db) {
    const router = (0, express_1.Router)();
    const contactsController = new contactsController_1.ContactsController(db);
    // Apply authentication middleware to all routes
    router.use(auth_1.authMiddleware);
    // CRUD routes
    router.get('/', (req, res) => contactsController.getContacts(req, res));
    router.get('/stats', (req, res) => contactsController.getContactStats(req, res));
    router.get('/:id', (req, res) => contactsController.getContact(req, res));
    router.post('/', (req, res) => contactsController.createContact(req, res));
    router.put('/:id', (req, res) => contactsController.updateContact(req, res));
    router.delete('/:id', (req, res) => contactsController.deleteContact(req, res));
    // CSV Import routes
    router.post('/import-csv/preview', contactsController_1.upload.single('csvFile'), (req, res) => contactsController.previewCSV(req, res));
    router.post('/import-csv', contactsController_1.upload.single('csvFile'), (req, res) => contactsController.importCSV(req, res));
    // VCF Import routes
    router.post('/import-vcf/preview', contactsController_1.uploadVCF.single('vcfFile'), (req, res) => contactsController.previewVCF(req, res));
    router.post('/import-vcf', contactsController_1.uploadVCF.single('vcfFile'), (req, res) => contactsController.importVCF(req, res));
    // Phone Contacts Import routes
    router.post('/import-phone', (req, res) => contactsController.importPhoneContacts(req, res));
    // Import and validation routes
    router.post('/import', (req, res) => contactsController.importContacts(req, res));
    router.post('/validate', (req, res) => contactsController.validateContact(req, res));
    return router;
}
//# sourceMappingURL=contacts.js.map