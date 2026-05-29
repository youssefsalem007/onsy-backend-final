import dotenv from "dotenv";
import { resolve } from "node:path";
const NODE_ENV = process.env.NODE_ENV;

let envPaths = {
  development: ".env.development",
  production: ".env.production",
};
dotenv.config({ path: resolve(`config/${envPaths[NODE_ENV]}`) });

export const PORT = +process.env.PORT;
export const SALT_ROUNDS = +process.env.SALT_ROUNDS;
export const DB_URI = process.env.DB_URI;
export const ACCESS_SECRET_KEY = process.env.ACCESS_SECRET_KEY;
export const REFRESH_SECRET_KEY = process.env.REFRESH_SECRET_KEY;
export const PREFIX = process.env.PREFIX;
export const EMAIL = process.env.EMAIL;
export const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const REDIS_URL = process.env.REDIS_URL;
export const AI_ENGINE_URL = process.env.AI_ENGINE_URL;
export const GROQ_API_KEY = process.env.GROQ_API_KEY;

