import { Router } from "express";
import * as MS from "./mood.service.js"
import * as MV from "./mood.validation.js"
import { authentication } from "../../common/middleware/authentication.js";
import { validation } from "../../common/middleware/validation.js";
const moodRouter = Router()


moodRouter.post("/create-mood", authentication, validation(MV.logMoodSchema), MS.moodLog)
moodRouter.get("/all-moods", authentication, MS.allMoods)
moodRouter.get("/:moodId", authentication, validation(MV.getMoodSchema), MS.getMoodById)
moodRouter.patch("/:moodId", authentication, validation(MV.updateMoodSchema), MS.updateMood)
moodRouter.delete("/:moodId", authentication, validation(MV.deleteMoodSchema), MS.deleteMood)
// moodRouter.get("/avg-mood/:userId", authentication, validation(MV.getAvgMoodSchema), MS.getAvgMood) 




export default moodRouter