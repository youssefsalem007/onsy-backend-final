import mongoose from "mongoose"

const moodSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "auth",
        required: true
    },
    mood: {
        type: Number,
        required: true
    },
    isUpdated:{
        type: Boolean,
        default: false
    }

},{
    timestamps: true
})

const moodModel = mongoose.models.mood || mongoose.model("mood", moodSchema)
export default moodModel;