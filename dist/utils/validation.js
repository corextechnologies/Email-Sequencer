"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailAccountValidation = exports.userValidation = void 0;
const joi_1 = __importDefault(require("joi"));
exports.userValidation = {
    register: joi_1.default.object({
        email: joi_1.default.string().email().required().messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),
        password: joi_1.default.string().min(6).required().messages({
            'string.min': 'Password must be at least 6 characters long',
            'any.required': 'Password is required'
        })
    }),
    login: joi_1.default.object({
        email: joi_1.default.string().email().required().messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),
        password: joi_1.default.string().required().messages({
            'any.required': 'Password is required'
        })
    })
};
exports.emailAccountValidation = {
    create: joi_1.default.object({
        provider: joi_1.default.string().min(1).max(100).required().messages({
            'any.required': 'Provider is required',
            'string.max': 'Provider name is too long'
        }),
        imap_host: joi_1.default.string().hostname().required().messages({
            'any.required': 'IMAP host is required',
            'string.hostname': 'Please provide a valid hostname'
        }),
        imap_port: joi_1.default.number().integer().min(1).max(65535).default(993).messages({
            'number.base': 'IMAP port must be a number',
            'number.min': 'Port must be between 1 and 65535',
            'number.max': 'Port must be between 1 and 65535'
        }),
        smtp_host: joi_1.default.string().hostname().required().messages({
            'any.required': 'SMTP host is required',
            'string.hostname': 'Please provide a valid hostname'
        }),
        smtp_port: joi_1.default.number().integer().min(1).max(65535).default(587).messages({
            'number.base': 'SMTP port must be a number',
            'number.min': 'Port must be between 1 and 65535',
            'number.max': 'Port must be between 1 and 65535'
        }),
        username: joi_1.default.string().min(1).max(255).required().messages({
            'any.required': 'Username is required',
            'string.max': 'Username is too long'
        }),
        password: joi_1.default.string().min(1).required().messages({
            'any.required': 'Password is required'
        })
    })
};
//# sourceMappingURL=validation.js.map