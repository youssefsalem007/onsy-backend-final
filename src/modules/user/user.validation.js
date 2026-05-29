import joi from "joi"
import { generalRules } from "../../common/utils/security/generalRules.js"
import { genderEnum } from "../../common/enum/auth.enum.js"

export const updateProfileSchema = {
    body: joi.object({
        firstName: joi.string(),
        lastName: joi.string(),
        gender: joi.string().valid(...Object.values(genderEnum)),
        age: joi.number().min(1).max(100)
    }).required()
}

export const changePasswordSchema = {
    body: joi.object({
        oldPassword: generalRules.password.required(),
        newPassword: generalRules.password.required(),
        confirmPassword: generalRules.confirmPassword.valid(joi.ref("newPassword")).required()
    }).required()
}
