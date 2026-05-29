import mongoose from "mongoose";

const blacklistTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  },
);

const BlacklistToken =
  mongoose.models.BlacklistToken ||
  mongoose.model("BlacklistToken", blacklistTokenSchema);

export default BlacklistToken;
