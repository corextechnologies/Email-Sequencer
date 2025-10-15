"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const connection_1 = require("./connection");
const migrations_1 = require("./migrations");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
async function migrate() {
    try {
        console.log('🔍 Environment check:');
        console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
        console.log('PGHOST:', process.env.PGHOST);
        console.log('PGUSER:', process.env.PGUSER);
        console.log('PGDATABASE:', process.env.PGDATABASE);
        await connection_1.Database.initialize();
        await migrations_1.Migrations.runAll();
        process.exit(0);
    }
    catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}
migrate();
//# sourceMappingURL=migrate.js.map