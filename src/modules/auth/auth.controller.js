import { Router } from "express";
import { validation } from "../../common/middleware/validation.js";
import * as AV from "./auth.validation.js";
import * as AS from "./auth.service.js";
import { authentication } from "../../common/middleware/authentication.js";
const authRouter = Router();

authRouter.post(
  "/signup",
  validation(AV.signUpSchema),
  AS.signUp,
);

authRouter.post("/signin", validation(AV.signInSchema), AS.signIn);
authRouter.post("/signout", authentication, AS.signOut);
authRouter.post("/verify-otp", validation(AV.verifyOtpSchema), AS.verifyOtp);
authRouter.post("/resend-otp", AS.resendOtp);
authRouter.post("/forget-password", validation(AV.forgetPasswordSchema), AS.forgetPassword);
authRouter.post("/verify-forget-password-otp", validation(AV.verifyForgetPasswordOtpSchema), AS.verifyForgetPasswordOtp);
authRouter.post("/reset-password", validation(AV.resetPasswordSchema), AS.resetPassword);
authRouter.post("/google-signup", AS.googleSignUp);

export default authRouter;
