"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const connection_1 = require("../database/connection");
const jwt_1 = require("../utils/jwt");
class AuthService {
    static async register(userData) {
        const { email, password } = userData;
        // Check if user already exists
        const existingUser = await connection_1.Database.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            throw new Error('User with this email already exists');
        }
        // Hash password
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        // Create user
        const result = await connection_1.Database.query('INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at', [email, passwordHash]);
        const user = result.rows[0];
        // Generate JWT token
        const token = jwt_1.JwtHelper.generateToken({
            userId: user.id,
            email: user.email
        });
        return {
            user: {
                id: user.id,
                email: user.email,
                created_at: user.created_at,
                updated_at: user.created_at
            },
            token
        };
    }
    static async login(credentials) {
        const { email, password } = credentials;
        // Find user
        const result = await connection_1.Database.query('SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            throw new Error('Invalid email or password');
        }
        const user = result.rows[0];
        // Verify password
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isValidPassword) {
            throw new Error('Invalid email or password');
        }
        // Generate JWT token
        const token = jwt_1.JwtHelper.generateToken({
            userId: user.id,
            email: user.email
        });
        return {
            user: {
                id: user.id,
                email: user.email,
                created_at: user.created_at,
                updated_at: user.updated_at
            },
            token
        };
    }
    static async getUserById(userId) {
        const result = await connection_1.Database.query('SELECT id, email, created_at, updated_at FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0];
    }
    static async getUserByEmail(email) {
        const result = await connection_1.Database.query('SELECT id, email, created_at, updated_at FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0];
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=authService.js.map