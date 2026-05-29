import {hashSync, compareSync} from "bcrypt";
import { SALT_ROUNDS } from "../../../../config/config.service.js";

export const Hash = ({plain_text, salt_rounds = SALT_ROUNDS})=>{
    return hashSync(plain_text, salt_rounds)
}

export const Compare = ({plain_text, cipher_text})=>{
    return compareSync(plain_text, cipher_text)
}
