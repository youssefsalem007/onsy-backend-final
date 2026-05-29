import joi from "joi"
import { Types } from "mongoose"
export const generalRules = {
    email: joi.string().email({maxDomainSegments:2}),
    password: joi.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,20}$/),
    confirmPassword: joi.string().valid(joi.ref("password")),
    id: joi.string().custom((v, h) => {
        const isValid = Types.ObjectId.isValid(v)
        return isValid ? v : h.message("invalid id")
    })
    }