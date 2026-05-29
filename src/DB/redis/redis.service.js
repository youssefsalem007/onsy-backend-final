import { emailEnum } from "../../common/enum/email.enum.js"
import { client } from "./redis.connection.js"


export const get = async (key) => {
    try {
        try {
            return JSON.parse(await client.get(key))
        } catch (error) {
            return await client.get(key)
        }
    } catch (error) {
        console.log("error in getting data from redis", error);
    }
}

export const revoked_key = (authId, jti) => {
    return `revoke_token::${authId}::${jti}`
}

export const deleteKey = async (key) => {
    try {
        if(!key.length) return 0
        return await client.del(key)
    } catch (error) {
        console.log("error in deleting data from redis", error)
    }
}

export const keys = async (pattern) => {
    try {
        return await client.keys(`${pattern}*`)
    } catch (error) {
        console.log("failed to get keys from redis", error)
    }
}

export const get_key = ({authId}) => {
    return `revoke_token::${authId}`
}

export const getValue = async (key) => {
    return await client.get(key);
  }

export const otp_key = ({email, subject = emailEnum.confirmEmail}) => {
    return `otp::${email}::${subject}`
}

export const max_otp_key = ({email}) => {
    return `${otp_key({email})}::max-tries`
}

export const block_otp_key = ({email}) => {
    return `${otp_key({email})}::block`
}

export const ttl = async (key) => {
    try {
        return await client.ttl(key)
    } catch (error) {
        console.log("failed to get ttl from redis", error)
    }
}

export const incr = async(key) => {
    try {
        return await client.incr(key)
    } catch (error) {
        throw new Error("failed to increment key", error)
    }
}

export const setValue = async ({key, value, ttl} = {}) => {
    try {
        const data = typeof value === "string" ? value : JSON.stringify(value)
        return ttl ? await client.set(key, data, {EX:ttl}) : await client.set(key, data)
    } catch (error) {
        console.log("error to set data into redis", error);
    }
}

export const update = async ({key, value} = {}) => {
    try {
        if(!await client.exists(key)) return 0
        return await setValue({key, value, ttl})
    } catch (error) {
        console.log("error in updating data in redis", error)   
    }
}


