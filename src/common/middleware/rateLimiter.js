import rateLimit from "express-rate-limit";


const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {message: "Too many requests"},
    standardHeaders: true,
    legacyHeaders: false
})
export default rateLimiter