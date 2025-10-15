"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileRoutes = void 0;
const express_1 = require("express");
const profileController_1 = require("../controllers/profileController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
exports.profileRoutes = router;
// Apply authentication middleware to all routes
router.use(auth_1.authMiddleware);
// Profile routes
router.get('/', profileController_1.ProfileController.getProfile);
router.put('/change-password', profileController_1.ProfileController.changePassword);
router.put('/change-email', profileController_1.ProfileController.changeEmail);
//# sourceMappingURL=profile.js.map