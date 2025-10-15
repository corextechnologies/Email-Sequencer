"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailAccountRoutes = void 0;
const express_1 = require("express");
const emailAccountController_1 = require("../controllers/emailAccountController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
exports.emailAccountRoutes = router;
// All email account routes require authentication
router.use(auth_1.authMiddleware);
// Email account CRUD operations
router.post('/', emailAccountController_1.EmailAccountController.createEmailAccount);
router.get('/', emailAccountController_1.EmailAccountController.getEmailAccounts);
router.get('/:id', emailAccountController_1.EmailAccountController.getEmailAccount);
router.put('/:id', emailAccountController_1.EmailAccountController.updateEmailAccount);
router.delete('/:id', emailAccountController_1.EmailAccountController.deleteEmailAccount);
router.patch('/:id/toggle-status', emailAccountController_1.EmailAccountController.toggleEmailAccountStatus);
exports.default = router;
//# sourceMappingURL=emailAccounts.js.map