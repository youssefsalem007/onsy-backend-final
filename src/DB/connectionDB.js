import mongoose from "mongoose";
import { DB_URI } from "../../config/config.service.js";

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const checkConnectionDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      serverSelectionTimeoutMS: 5000,
      bufferCommands: false, 
    };

    cached.promise = mongoose.connect(DB_URI, opts).then((mongoose) => {
      console.log("DB connected");
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null; 
    console.error("DB connection error:", e);
    throw e;
  }

  return cached.conn;
};

export default checkConnectionDB;