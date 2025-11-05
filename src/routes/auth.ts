import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.post('/send-registration-otp', AuthController.sendRegistrationOTP);
router.post('/verify-registration-otp', AuthController.verifyRegistrationOTP);
router.post('/resend-registration-otp', AuthController.resendRegistrationOTP);

// Protected routes
router.get('/me', authMiddleware, AuthController.getMe);

export { router as authRoutes };
