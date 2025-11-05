import Joi from 'joi';
export declare const userValidation: {
    register: Joi.ObjectSchema<any>;
    login: Joi.ObjectSchema<any>;
    forgotPassword: Joi.ObjectSchema<any>;
    resetPassword: Joi.ObjectSchema<any>;
    sendRegistrationOTP: Joi.ObjectSchema<any>;
    verifyRegistrationOTP: Joi.ObjectSchema<any>;
    resendRegistrationOTP: Joi.ObjectSchema<any>;
};
export declare const emailAccountValidation: {
    create: Joi.ObjectSchema<any>;
};
//# sourceMappingURL=validation.d.ts.map