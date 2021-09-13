import Joi from "joi";

export class Validations {
    static async UserCreateAccountValidation() {
        return Joi.object({
            name: Joi.string()
                .alphanum()
                .required()
                .error(new Error("Name is invalid"))
                .min(4)
                .max(64),
            password: Joi.string()
                .required()
                .min(4)
                .max(64)
                .error(new Error("Password is invalid")),
            phone: Joi.string()
                .error(Error("Phone number is invalid"))
                .pattern(/^9989[012345789][0-9]{7}$/)
        });
    }
    static async UserLoginAccountValidation() {
        return Joi.object({
            password: Joi.string()
                .required()
                .min(4)
                .max(64)
                .error(new Error("Password is invalid")),
            phone: Joi.string()
                .error(Error("Phone number is invalid"))
                .pattern(/^9989[012345789][0-9]{7}$/),
        });
    }
    static async UserValidateCodeValidation() {
        return Joi.object({
            code: Joi.number()
                .required()
                .min(10000)
                .max(99999)
                .error(Error("Invalid code!"))
        })
    }
}