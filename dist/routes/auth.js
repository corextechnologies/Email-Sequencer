"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
exports.authRoutes = router;
// Public routes
router.post('/register', authController_1.AuthController.register);
router.post('/login', authController_1.AuthController.login);
router.post('/forgot-password', authController_1.AuthController.forgotPassword);
router.post('/reset-password', authController_1.AuthController.resetPassword);
router.post('/send-registration-otp', authController_1.AuthController.sendRegistrationOTP);
router.post('/verify-registration-otp', authController_1.AuthController.verifyRegistrationOTP);
router.post('/resend-registration-otp', authController_1.AuthController.resendRegistrationOTP);
// Protected routes
router.get('/me', auth_1.authMiddleware, authController_1.AuthController.getMe);
//# sourceMappingURL=auth.js.map