import nodemailer from "nodemailer"

import { EMAIL, EMAIL_PASSWORD } from "../../../../config/config.service.js"
import { emailEnum } from "../../enum/email.enum.js" 
import { block_otp_key, get, incr, max_otp_key, otp_key, setValue, ttl } from "../../../DB/redis/redis.service.js"
import crypto from "node:crypto"
import { emailTemp } from "./email.template.js"
import { Hash } from "../security/hash.security.js"


const transporter = nodemailer.createTransport({
    service: "gmail",
    pool: true,
    auth: {
        user: EMAIL,
        pass: EMAIL_PASSWORD
    }
})

export const sendEmail = async ({ to, subject, html }) => {
    await transporter.sendMail({
        from: `Onsy App <${EMAIL}>`,
        to,
        subject,
        html
    })
}


export const sendEmailOtp = async({email, subject} = {}) => {
    const blocked = await ttl(block_otp_key({email}))
    if(blocked > 0){
        throw new Error(`you are blocked try again after ${blocked} seconds`) 
    }

    const otpTtl = await ttl(otp_key({email, subject}))
    if(otpTtl > 0){
        throw new Error(`otp can be resent after ${otpTtl} seconds`)
    }

    const maxOtp = await get(max_otp_key({email}))
    if(maxOtp > 10){
        await setValue({key: block_otp_key({email}), value:1, ttl: 60})
        throw new Error("you have exceeded the number of tries, try again later")
    }

    const otp = crypto.randomInt(1000, 10000)
    
        await sendEmail({
            to:email,
            subject:"welcome to onsy",
            html:emailTemp(otp)
        })
    

    await setValue({key: otp_key({email, subject}), value: Hash({plain_text:`${otp}`}), ttl: 60*5})
    await incr(max_otp_key({email}))
}