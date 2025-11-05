import Joi from 'joi';

// Reusable password validation schema
const passwordValidation = Joi.string()
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

export const userValidation = {
  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: passwordValidation
  }),

  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required'
    })
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    })
  }),

  resetPassword: Joi.object({
    token: Joi.string().required().messages({
      'any.required': 'Reset token is required',
      'string.empty': 'Reset token cannot be empty'
    }),
    password: passwordValidation
  }),

  sendRegistrationOTP: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: passwordValidation
  }),

  verifyRegistrationOTP: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    code: Joi.string()
      .pattern(/^\d{6}$/)
      .required()
      .messages({
        'any.required': 'Verification code is required',
        'string.empty': 'Verification code cannot be empty',
        'string.pattern.base': 'Verification code must be exactly 6 digits'
      })
  }),

  resendRegistrationOTP: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    })
  })
};

export const emailAccountValidation = {
  create: Joi.object({
    provider: Joi.string().min(1).max(100).required().messages({
      'any.required': 'Provider is required',
      'string.max': 'Provider name is too long'
    }),
    imap_host: Joi.string().hostname().required().messages({
      'any.required': 'IMAP host is required',
      'string.hostname': 'Please provide a valid hostname'
    }),
    imap_port: Joi.number().integer().min(1).max(65535).default(993).messages({
      'number.base': 'IMAP port must be a number',
      'number.min': 'Port must be between 1 and 65535',
      'number.max': 'Port must be between 1 and 65535'
    }),
    smtp_host: Joi.string().hostname().required().messages({
      'any.required': 'SMTP host is required',
      'string.hostname': 'Please provide a valid hostname'
    }),
    smtp_port: Joi.number().integer().min(1).max(65535).default(587).messages({
      'number.base': 'SMTP port must be a number',
      'number.min': 'Port must be between 1 and 65535',
      'number.max': 'Port must be between 1 and 65535'
    }),
    username: Joi.string().min(1).max(255).required().messages({
      'any.required': 'Username is required',
      'string.max': 'Username is too long'
    }),
    password: Joi.string().min(1).required().messages({
      'any.required': 'Password is required'
    })
  })
};
