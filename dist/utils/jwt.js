"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtHelper = void 0;
const jwt = __importStar(require("jsonwebtoken"));
class JwtHelper {
    static generateToken(payload) {
        const tokenPayload = {
            userId: payload.userId,
            email: payload.email
        };
        return jwt.sign(tokenPayload, this.secret, { expiresIn: '24h' });
    }
    static verifyToken(token) {
        try {
            const decoded = jwt.verify(token, this.secret);
            return {
                userId: decoded.userId,
                email: decoded.email
            };
        }
        catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new Error('Token has expired');
            }
            else if (error instanceof jwt.JsonWebTokenError) {
                throw new Error('Invalid token');
            }
            else {
                throw new Error('Token verification failed');
            }
        }
    }
    static decodeToken(token) {
        try {
            const decoded = jwt.decode(token);
            if (decoded && decoded.userId && decoded.email) {
                return {
                    userId: decoded.userId,
                    email: decoded.email
                };
            }
            return null;
        }
        catch (error) {
            return null;
        }
    }
}
exports.JwtHelper = JwtHelper;
JwtHelper.secret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
//# sourceMappingURL=jwt.js.map