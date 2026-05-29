import { Router } from "express";
import * as US from "./user.service.js";
import * as UV from "./user.validation.js";
import { authentication } from "../../common/middleware/authentication.js";
import { validation } from "../../common/middleware/validation.js";


const userRouter = Router();

userRouter.get("/profile", authentication, US.getProfile);
userRouter.put("/profile", authentication, validation(UV.updateProfileSchema), US.updateProfile);
userRouter.patch("/password", authentication, validation(UV.changePasswordSchema), US.changePassword);
userRouter.delete("/account", authentication, US.deleteAccount);

export default userRouter;


