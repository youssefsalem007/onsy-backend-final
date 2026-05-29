import { Router } from "express";
import { authentication } from "../../common/middleware/authentication.js";
import * as AS from "./ai.service.js";

const aiRouter = Router(); 
aiRouter.post("/send-message", authentication, AS.sendMessage);
aiRouter.post("/new-session", authentication, AS.newSession);
aiRouter.get("/all-sessions", authentication, AS.allSessions);
aiRouter.get("/session/:id", authentication, AS.oneSession);
aiRouter.get("/emotional-trend", authentication, AS.emotionalTrend);

export default aiRouter;
