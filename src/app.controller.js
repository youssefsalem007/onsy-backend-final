import express from "express";
import cors from "cors";
import { PORT } from "../config/config.service.js";
import checkConnectionDB from "./DB/connectionDB.js";
import authRouter from "./modules/auth/auth.controller.js";
import userRouter from "./modules/user/user.controller.js";
import { connectRedis } from "./DB/redis/redis.connection.js";
import http from "http";
import { initSocket } from "./socket/index.js";
import moodRouter from "./modules/mood/mood.controller.js";
import aiRouter from "./modules/ai/ai.controller.js";
import eegRouter from "./modules/eeg/eeg.controller.js";
import analysisRouter from "./modules/analysis/analysis.controller.js";
import adminRouter from "./modules/admin/admin.controller.js";
import rateLimiter from "./common/middleware/rateLimiter.js";


export const app = express();

const isProd = process.env.NODE_ENV === "production";

const bootstrap = async () => {
  app.set("trust proxy", 1);
  app.use(cors({ origin: "*" }), express.json(), rateLimiter);

  app.get("/", (req, res) => {
    res.status(200).json({ message: "welcome to onsy" });
  });

  app.use("/auth", authRouter);
  app.use("/user", userRouter);
  app.use("/mood", moodRouter);
  app.use("/ai", aiRouter); 
  app.use("/eeg", eegRouter);
  app.use("/analysis", analysisRouter);
  app.use("/admin", adminRouter);

  await checkConnectionDB();
  await connectRedis();

  app.use("/*demo", (req, res, next) => {
    throw new Error(`invalid url ${req.originalUrl}`, { cause: 404 });
  });

  app.use((err, req, res, next) => {
    res.status(err.cause || 500).json({
      message: err.message,
      ...(!isProd && { stack: err.stack }),
    });
  });

  // Skip listen() in serverless environments (Vercel)
  if (!process.env.VERCEL) {
    const httpServer = http.createServer(app);
    initSocket(httpServer);
    httpServer.listen(PORT, () => {
      console.log(`server is running on port ${PORT}`);
    });
  }
};

export default bootstrap;
