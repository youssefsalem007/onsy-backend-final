import { createClient } from "redis";
import { REDIS_URL } from "../../../config/config.service.js";

export const client = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 2000),
  },
});

client.on("error", (err) => console.error("Redis client error:", err));

let isConnecting = false;

export const connectRedis = async () => {
  if (client.isOpen) return; 
  if (isConnecting) return;  

  isConnecting = true;
  try {
    await client.connect();
    console.log("Connected to Redis");
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
  } finally {
    isConnecting = false;
  }
};