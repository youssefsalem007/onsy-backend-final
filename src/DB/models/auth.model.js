import mongoose from "mongoose";
import { genderEnum, providerEnum } from "../../common/enum/auth.enum.js";

const authSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return this.provider == providerEnum.google ? false : true;
      },
    },
    provider: {
      type: String,
      enum: Object.values(providerEnum),
      default: providerEnum.system,
    },
    gender: {
      type: String,
      enum: Object.values(genderEnum),
      required: true,
    },
    age: {
      type: Number,
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    /*otp: {
      code: { type: String },
      expiresAt: { type: Date },
    },
    isOtpVerified: {
      type: Boolean,
      default: false,
    }*/
    changeCredential:Date
  },
  {
    strictQuery: true,
    timestamps: true,
  },
);

authSchema
  .virtual("fullName")
  .get(function () {
    return this.firstName + " " + this.lastName;
  })
  .set(function (value) {
    const [firstName, lastName] = value.split(" ");
    this.set({ firstName, lastName });
  });

const authModel = mongoose.models.auth || mongoose.model("auth", authSchema);
export default authModel;
