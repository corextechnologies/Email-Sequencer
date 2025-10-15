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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt = __importStar(require("bcryptjs"));
const connection_1 = require("./connection");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
async function seed() {
    try {
        await connection_1.Database.initialize();
        console.log('🌱 Seeding database...');
        // Create test user
        const hashedPassword = await bcrypt.hash('password123', 10);
        const userResult = await connection_1.Database.query('INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id', ['test@example.com', hashedPassword]);
        if (userResult.rows.length > 0) {
            console.log('✅ Test user created: test@example.com / password123');
            // Create test email account
            const { EncryptionHelper } = await Promise.resolve().then(() => __importStar(require('../utils/encryption')));
            const encryptedPassword = EncryptionHelper.encrypt('testpassword');
            await connection_1.Database.query(`INSERT INTO email_accounts 
         (user_id, provider, imap_host, imap_port, smtp_host, smtp_port, username, encrypted_password) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         ON CONFLICT DO NOTHING`, [
                userResult.rows[0].id,
                'Gmail',
                'imap.gmail.com',
                993,
                'smtp.gmail.com',
                587,
                'test@gmail.com',
                encryptedPassword
            ]);
            console.log('✅ Test email account created');
        }
        else {
            console.log('ℹ️ Test user already exists');
        }
        console.log('✅ Database seeded successfully');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}
seed();
//# sourceMappingURL=seed.js.map