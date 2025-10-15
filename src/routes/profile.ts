import { Router } from 'express';
import { ProfileController } from '../controllers/profileController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Profile routes
router.get('/', ProfileController.getProfile);
router.put('/change-password', ProfileController.changePassword);
router.put('/change-email', ProfileController.changeEmail);

export { router as profileRoutes };
