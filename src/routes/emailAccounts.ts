import { Router } from 'express';
import { EmailAccountController } from '../controllers/emailAccountController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All email account routes require authentication
router.use(authMiddleware);

// Email account CRUD operations
router.post('/', EmailAccountController.createEmailAccount);
router.get('/', EmailAccountController.getEmailAccounts);
router.get('/:id', EmailAccountController.getEmailAccount);
router.put('/:id', EmailAccountController.updateEmailAccount);
router.delete('/:id', EmailAccountController.deleteEmailAccount);
router.patch('/:id/toggle-status', EmailAccountController.toggleEmailAccountStatus);

export { router as emailAccountRoutes };
export default router;
