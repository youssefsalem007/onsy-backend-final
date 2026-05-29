import joi from "joi";
import { generalRules } from "../../common/utils/security/generalRules.js";
import { genderEnum } from "../../common/enum/auth.enum.js";

export const signUpSchema = {
  body: joi
    .object({
      firstName: joi.string().required(),
      lastName: joi.string().required(),
      email: generalRules.email.required(),
      password: generalRules.password.required(),
      confirmPassword: generalRules.confirmPassword.required(),
      gender: joi
        .string()
        .valid(...Object.values(genderEnum))
        .required(),
      age: joi.number().min(1).max(100).required(),
    })
    .required(),
};

export const signInSchema = {
  body: joi
    .object({
      email: generalRules.email.required(),
      password: generalRules.password.required(),
    })
    .required(),
};

export const verifyOtpSchema = {
  body: joi
    .object({
      email: generalRules.email.required(),
      otp: joi.string().length(4).required(),
    })
    .required(),
};

export const forgetPasswordSchema = {
  body: joi
    .object({
      email: generalRules.email.required(),
    })
    .required(),
};

export const verifyForgetPasswordOtpSchema = {
  body: joi
    .object({
      email: generalRules.email.required(),
      otp: joi.string().length(4).required(),
    })
    .required(),
};

export const resetPasswordSchema = {
  body: joi
    .object({
      email: generalRules.email.required(),
      otp: joi.number().min(1000).max(9999).required(),
      password: generalRules.password.required(),
      confirmPassword: generalRules.confirmPassword.required(),
    })
    .required(),
};
