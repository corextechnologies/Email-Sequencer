"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailAccountValidation = exports.userValidation = void 0;
const joi_1 = __importDefault(require("joi"));
// Reusable password validation schema
const passwordValidation = joi_1.default.string()
    .min(8)
    .pattern(/[A-Z]/)
    .pattern(/[0-9]/)
    .required()
    .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.base': 'Password must contain at least 1 uppercase letter and 1 digit',
    'any.required': 'Password is required',
    'string.empty': 'Password cannot be empty'
});
exports.userValidation = {
    register: joi_1.default.object({
        email: joi_1.default.string().email().required().messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),
        password: passwordValidation
    }),
    login: joi_1.default.object({
        email: joi_1.default.string().email().required().messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),
        password: joi_1.default.string().required().messages({
            'any.required': 'Password is required'
        })
    }),
    forgotPassword: joi_1.default.object({
        email: joi_1.default.string().email().required().messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        })
    }),
    resetPassword: joi_1.default.object({
        token: joi_1.default.string().required().messages({
            'any.required': 'Reset token is required',
            'string.empty': 'Reset token cannot be empty'
        }),
        password: passwordValidation
    }),
    sendRegistrationOTP: joi_1.default.object({
        email: joi_1.default.string().email().required().messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),
        password: passwordValidation
    }),
    verifyRegistrationOTP: joi_1.default.object({
        email: joi_1.default.string().email().required().messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),
        code: joi_1.default.string()
            .pattern(/^\d{6}$/)
            .required()
            .messages({
            'any.required': 'Verification code is required',
            'string.empty': 'Verification code cannot be empty',
            'string.pattern.base': 'Verification code must be exactly 6 digits'
        })
    }),
    resendRegistrationOTP: joi_1.default.object({
        email: joi_1.default.string().email().required().messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
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