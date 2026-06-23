import authModel from "../../DB/models/auth.model.js";
import moodModel from "../../DB/models/mood.model.js";
import Session from "../../DB/models/Session.js";
import successResponse from "../../common/utils/response.success.js";
import { roleEnum } from "../../common/enum/auth.enum.js";

export const getDashboardStats = async (req, res, next) => {
  try {
    const totalUsers = await authModel.countDocuments({ role: roleEnum.user });
    const activeUsers = await authModel.countDocuments({ role: roleEnum.user, isVerified: true });
    const totalMoodEntries = await moodModel.countDocuments();
    
    const chatStats = await Session.aggregate([
      { $project: { msgCount: { $size: { $ifNull: ["$messages", []] } } } },
      { $group: { _id: null, total: { $sum: "$msgCount" } } }
    ]);
    
    const totalChatMessages = chatStats.length > 0 ? chatStats[0].total : 0;

    successResponse({
      res,
      status: 200,
      message: "Dashboard statistics retrieved successfully",
      data: {
        totalUsers,
        activeUsers,
        totalMoodEntries,
        totalChatMessages
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (page - 1) * limit;
    
    const filter = { role: roleEnum.user };
    
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }
    
    if (status) {
      filter.isVerified = status === 'active';
    }

    const total = await authModel.countDocuments(filter);
    const users = await authModel.find(filter)
      .select("-password -changeCredential")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    successResponse({
      res,
      status: 200,
      message: "Users retrieved successfully",
      data: {
        users,
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getUserDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const user = await authModel.findById(id).select("-password -changeCredential");
    if (!user) {
      return next(new Error("User not found", { cause: 404 }));
    }

    const moodStats = await moodModel.aggregate([
      { $match: { user: user._id } },
      { $group: { _id: null, totalEntries: { $sum: 1 }, avgMood: { $avg: "$mood" } } }
    ]);

    const chatStats = await Session.aggregate([
      { $match: { user: user._id } },
      { $group: { 
          _id: null, 
          totalSessions: { $sum: 1 }, 
          totalMessages: { $sum: { $size: { $ifNull: ["$messages", []] } } },
          avgRisk: { $avg: "$summary.session_risk" }
        } 
      }
    ]);

    successResponse({
      res,
      status: 200,
      message: "User details retrieved successfully",
      data: {
        user,
        moodStatistics: moodStats[0] || { totalEntries: 0, avgMood: 0 },
        chatStatistics: chatStats[0] || { totalSessions: 0, totalMessages: 0, avgRisk: 0 }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const user = await authModel.findById(id);
    if (!user) {
      return next(new Error("User not found", { cause: 404 }));
    }

    await moodModel.deleteMany({ user: id });
    await Session.deleteMany({ user: id });
    await authModel.findByIdAndDelete(id);

    successResponse({
      res,
      status: 200,
      message: "User and all related records deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};

export const exportUsers = async (req, res, next) => {
  try {
    const users = await authModel.find({ role: roleEnum.user }).sort({ createdAt: -1 });
    
    // Generate CSV string
    const headers = ['Name', 'Email', 'Registration Date', 'Status'];
    const rows = users.map(u => [
      `"${u.firstName} ${u.lastName}"`,
      `"${u.email}"`,
      `"${u.createdAt.toISOString()}"`,
      `"${u.isVerified ? 'Active' : 'Pending'}"`
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users_export.csv');
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

export const getAnalytics = async (req, res, next) => {
  try {
    // Mood distribution
    const moodDistribution = await moodModel.aggregate([
      { $group: { _id: "$mood", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Most active users by sessions
    const activeUsers = await Session.aggregate([
      { $group: { _id: "$user", sessionCount: { $sum: 1 } } },
      { $sort: { sessionCount: -1 } },
      { $limit: 5 },
      { $lookup: { from: "auths", localField: "_id", foreignField: "_id", as: "userInfo" } },
      { $unwind: "$userInfo" },
      { $project: { _id: 1, sessionCount: 1, name: { $concat: ["$userInfo.firstName", " ", "$userInfo.lastName"] }, email: "$userInfo.email" } }
    ]);

    successResponse({
      res,
      status: 200,
      message: "Analytics retrieved successfully",
      data: {
        moodDistribution,
        mostActiveUsers: activeUsers
      }
    });
  } catch (error) {
    next(error);
  }
};
