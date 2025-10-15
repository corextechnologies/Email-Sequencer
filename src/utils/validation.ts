import Joi from 'joi';

export const userValidation = {
  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Password must be at least 6 characters long',
      'any.required': 'Password is required'
    })
  }),

  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required'
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
