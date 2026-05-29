import { PREFIX } from "../../../config/config.service.js"
import { ACCESS_SECRET_KEY } from "../../../config/config.service.js"
import jwt from "jsonwebtoken"
import * as db_service from "../../DB/db.service.js"
import authModel from "../../DB/models/auth.model.js"
import { get, revoked_key } from "../../DB/redis/redis.service.js"

export const authentication = async (req, res, next) => {
    const {authorization} = req.headers
    if(!authorization || !authorization.startsWith(PREFIX)){
        throw new Error("Unauthorized")
    }
    const [prefix, token] = authorization.split(" ")
    if(prefix !== PREFIX){
        throw new Error("Invalid prefix")
    }
    const decodedToken = jwt.verify(token, ACCESS_SECRET_KEY)

    if(!decodedToken?.id || !decodedToken?.jti){
        throw new Error("Invalid token")
    }

    const auth = await db_service.findById({
        model:authModel,
        id: decodedToken.id,
        select: "-password"
    })

    if(!auth){
        throw new Error("user not found")
    }

    if(auth?.changeCredential?.getTime() > decodedToken.iat*1000){
        throw new Error("invalid token")
    }

    const revoked = await get(
        revoked_key(decodedToken.id, decodedToken.jti)
    )

    if(revoked){
        throw new Error("invalid token")
    }

    req.auth = auth
    req.decoded = decodedToken
    next()
}