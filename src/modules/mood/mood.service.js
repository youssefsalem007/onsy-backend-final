import * as db_service from "../../DB/db.service.js"
import moodModel from "../../DB/models/mood.model.js"
import successResponse from "../../common/utils/response.success.js"
import { triggerRealtimeAnalysis } from "../../services/analysis.service.js"


export const moodLog = async (req,res,next) => {
const timeCount = 12 * 60 * 60 * 1000
const logHours = new Date (Date.now() - timeCount )

const lastLog = await db_service.findOne({
    model: moodModel,
    filter: {user: req.auth._id, createdAt: {$gte: logHours}}
})

if(lastLog){
    const remainingTimeMS = (lastLog.createdAt.getTime() + timeCount) - Date.now()
    const hours = Math.floor(remainingTimeMS / (1000 * 60 * 60))
    const minutes = Math.ceil((remainingTimeMS % (1000 * 60 * 60)) / (1000 * 60))
    throw new Error(`please wait ${hours}h:${minutes}m to enter your mood again`, {cause: 429})
}

const logging = await db_service.create({
    model: moodModel,
    data: {user: req.auth._id, mood:req.body.mood}
})

triggerRealtimeAnalysis(req.auth._id);

successResponse({res, status:201, message:"mood logged", data: logging})
}

export const allMoods = async (req,res,next) => {
    const moods = await db_service.find({
        model: moodModel,
        filter: {user: req.auth._id}
    })

    if (moods.length == 0){
        throw new Error("No moods found", {cause: 404})
    }
    successResponse({res, data: moods})
}

export const getMoodById = async (req,res,next) => {
    const mood = await db_service.findOne({
        model: moodModel,
        filter: {
            _id: req.params.moodId,
            user: req.auth._id
        }
    })
    if(!mood) throw new Error("mood not found", {cause: 404})
    successResponse({res, data: mood})
}

export const updateMood = async (req,res,next) =>{
    const {mood} = req.body
    const updatedMood = await db_service.update({
        model: moodModel,
        filter: {_id: req.params.moodId, user: req.auth._id, isUpdated: false},
        update: {mood, isUpdated: true}
    })
    if(!updatedMood){
        throw new Error("You already updated your mood today")
    }
    triggerRealtimeAnalysis(req.auth._id);
    successResponse({res, message:"Mood updated", data: updatedMood})
}


export const deleteMood = async (req,res,next) => {
    const deletedMood = await db_service.findOneAndDelete({
        model: moodModel, 
        filter: {_id: req.params.moodId, user: req.auth._id}
    })
    if(!deletedMood) throw new Error("mood not found", {cause: 404})
    successResponse({res, message:"Mood deleted", data: deletedMood})
} 


// import mongoose from "mongoose";

// export const getAvgMood = async (req, res, next) => {
//   const { userId } = req.params;

//   const result = await moodModel.aggregate([
//     {
//       $match: {
//         user: new mongoose.Types.ObjectId(userId),
//       }, 
//     },
//     {
//       $group: {
//         _id: null,
//         avgMood: { $avg: "$mood" },
//       },
//     },
//   ]);

//   const avgMood = result.length ? result[0].avgMood : 0;

//   successResponse({
//     res,
//     data: { avgMood },
//   });
// };


