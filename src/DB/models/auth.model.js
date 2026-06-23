import mongoose from "mongoose";
import { genderEnum, providerEnum, roleEnum } from "../../common/enum/auth.enum.js";

const authSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: function () {
        return this.provider == providerEnum.google ? false : true;
      },
      trim: true,
    },
    lastName: {
      type: String,
      required: function () {
        return this.provider == providerEnum.google ? false : true;
      },
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
      required: function () {
        return this.provider == providerEnum.google ? false : true;
      },
    },
    age: {
      type: Number,
      required: function () {
        return this.provider == providerEnum.google ? false : true;
      },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: Object.values(roleEnum),
      default: roleEnum.user,
    },
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
