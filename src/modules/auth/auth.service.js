import * as db_service from "../../DB/db.service.js";
import authModel from "../../DB/models/auth.model.js";
import successResponse from "../../common/utils/response.success.js";
import { GenerateToken } from "../../common/utils/token.service.js";
import { Hash, Compare } from "../../common/utils/security/hash.security.js";
import {
  SALT_ROUNDS,
  ACCESS_SECRET_KEY,
  REFRESH_SECRET_KEY,
  GOOGLE_CLIENT_ID,
} from "../../../config/config.service.js";
import { randomUUID } from "node:crypto";
import { sendEmailOtp } from "../../common/utils/email/email.service.js";
import { OAuth2Client } from "google-auth-library";
import { providerEnum } from "../../common/enum/auth.enum.js";
import {
  deleteKey,
  get,
  otp_key,
  revoked_key,
  setValue,
} from "../../DB/redis/redis.service.js";
import { emailEnum } from "../../common/enum/email.enum.js";

export const signUp = async (req, res, next) => {
  const { firstName, lastName, email, password, confirmPassword, gender, age } =req.body;

  if (password !== confirmPassword) {
    return next(new Error("Password not match", { cause: 400 }));
  }

  if (
    await db_service.findOne({
      model: authModel,
      filter: { email },
    })
  ) {
    return next(new Error("Email already exists", { cause: 400 }));
  }

  const auth = await db_service.create({
    model: authModel,
    data: {
      firstName,
      lastName,
      email,
      password: Hash({ plain_text: password, salt_rounds: SALT_ROUNDS }),
      gender,
      age,
      isVerified: false,
    },
  });

  await sendEmailOtp({
    email: auth.email,
    subject: emailEnum.confirmEmail,
  });

  successResponse({
    res,
    status: 201,
    message: "Successful signUp",
    data: auth,
  });
};

export const googleSignUp = async (req, res, next) => {
  const { idToken } = req.body;
  const client = new OAuth2Client();

  const ticket = await client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();

  const { email, email_verified, name } = payload;

  let auth = await db_service.findOne({ model: authModel, filter: { email } });

  if (!auth) {
    auth = await db_service.create({
      model: authModel,
      data: {
        email,
        isVerified: email_verified,
        fullName: name,
        provider: providerEnum.google,
      },
    });
  }

  if (auth.provider == providerEnum.system) {
    throw new Error("log in using system", { cause: 400 });
  }

  const jwtid = randomUUID();
  const access_token = GenerateToken({
    payload: { id: auth._id, email: auth.email },
    secret_key: ACCESS_SECRET_KEY,
    options: { expiresIn: "1h", jwtid },
  });

  successResponse({ res, message: "success signIn", data: { access_token } });
};

export const verifyOtp = async (req, res, next) => {
  const { email, otp } = req.body;
  const receivedOtp = otp.toString().trim();

  const otpValue = await get(
    otp_key({ email, subject: emailEnum.confirmEmail }),
  );

  if (!otpValue) {
    throw new Error("otp expired");
  }

  if (!Compare({ plain_text: receivedOtp, cipher_text: otpValue })) {
    throw new Error("invalid otp");
  }

  const auth = await db_service.update({
    model: authModel,
    filter: { email, isVerified: false, provider: providerEnum.system },
    update: { isVerified: true },
  });

  if (!auth) {
    throw new Error("user not found or already confirmed");
  }

  await deleteKey(otp_key({ email, subject: emailEnum.confirmEmail }));

  successResponse({
    res,
    status: 200,
    message: "Account verified successfully!",
  });
};

export const resendOtp = async (req, res, next) => {
  const { email } = req.body;

  const auth = await db_service.findOne({
    model: authModel,
    filter: { email, isVerified: false, provider: providerEnum.system },
  });

  if (!auth) {
    throw new Error("user not found or already confirmed");
  }

  await sendEmailOtp({ email, subject: emailEnum.confirmEmail });

  successResponse({ res, message: "otp sent successfully" });
};

export const signIn = async (req, res, next) => {
  const { email, password } = req.body;

  const auth = await db_service.findOne({
    model: authModel,
    filter: { email },
  });
  if (!auth) {
    return next(new Error("Email not found", { cause: 400 }));
  }

  if (!auth.isVerified) {
    return next(new Error("Please verify your email first", { cause: 403 }));
  }

  if (!Compare({ plain_text: password, cipher_text: auth.password })) {
    return next(new Error("Password not match", { cause: 400 }));
  }

  const jwtid = randomUUID();
  const access_token = GenerateToken({
    payload: { id: auth._id, email: auth.email },
    secret_key: ACCESS_SECRET_KEY,
    options: { expiresIn: "1h", jwtid },
  });

  const refresh_token = GenerateToken({
    payload: { id: auth._id, email: auth.email },
    secret_key: REFRESH_SECRET_KEY,
    options: { expiresIn: "7d", jwtid },
  });

  successResponse({
    res,
    status: 200,
    message: "Successful signIn",
    data: { access_token, refresh_token },
  });
};

export const signOut = async (req, res, next) => {
  setValue({
    key: revoked_key(req.auth._id, req.decoded.jti),
    value: `${req.decoded.jti}`,
    ttl: req.decoded.exp - Math.floor(Date.now() / 1000),
  });

  successResponse({
    res,
    status: 200,
    message: "Successful signOut",
  });
};

export const forgetPassword = async (req, res, next) => {
  const { email } = req.body;

  const auth = await db_service.findOne({
    model: authModel,
    filter: { email, isVerified: true, provider: providerEnum.system },
  });

  if (!auth) {
    throw new Error("Email not found", { cause: 404 });
  }

  await sendEmailOtp({ email, subject: emailEnum.forgetPassword });

  successResponse({ res, status: 200, message: "OTP sent to your email" });
};

export const verifyForgetPasswordOtp = async (req, res, next) => {
  const { email, otp } = req.body;
  const receivedOtp = otp.toString().trim();
  const otpValue = await get(
    otp_key({ email, subject: emailEnum.forgetPassword }),
  );
  if (!otpValue) {
    throw new Error("otp expired");
  }

  if (!Compare({ plain_text: receivedOtp, cipher_text: otpValue })) {
    throw new Error("invalid otp");
  }

  await deleteKey(otp_key({ email, subject: emailEnum.forgetPassword }));
  await setValue({
    key: otp_key({ email, subject: emailEnum.resetPassword }),
    value: 1,
    ttl: 60 * 10,
  });
  successResponse({ res, status: 200, message: "OTP verified successfully" });
};

export const resetPassword = async (req, res, next) => {
  const { email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    throw new Error("Passwords do not match", { cause: 400 });
  }

  const otpVerified = await get(
    otp_key({ email, subject: emailEnum.resetPassword }),
  );
  if (!otpVerified) {
    throw new Error("verify your email first");
  }

  const auth = await db_service.update({
    model: authModel,
    filter: { email, provider: providerEnum.system, isVerified: true },
    update: {
      password: Hash({ plain_text: password, salt_rounds: SALT_ROUNDS }),
      changeCredential: new Date(),
    },
  });

  if (!auth) {
    return next(new Error("Email not found", { cause: 404 }));
  }

  await deleteKey(otp_key({ email, subject: emailEnum.resetPassword }));

  successResponse({ res, status: 200, message: "Password reset successfully" });
};
