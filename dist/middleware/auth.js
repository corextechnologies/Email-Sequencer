"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jwt_1 = require("../utils/jwt");
function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'MISSING_TOKEN',
                    message: 'Authorization header is required'
                }
            });
            return;
        }
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_TOKEN_FORMAT',
                    message: 'Authorization header must be in format: Bearer <token>'
                }
            });
            return;
        }
        const token = parts[1];
        try {
            const decoded = jwt_1.JwtHelper.verifyToken(token);
            req.user = decoded;
            next();
        }
        catch (tokenError) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_TOKEN',
                    message: tokenError instanceof Error ? tokenError.message : 'Invalid token'
                }
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                code: 'AUTH_ERROR',
                message: 'Authentication failed'
            }
        });
    }
}
//# sourceMappingURL=auth.js.map