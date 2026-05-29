import { Router } from "express";
import { authentication } from "../../common/middleware/authentication.js";
import AIAnalysis from '../../DB/models/AIAnalysis.model.js';
import successResponse from '../../common/utils/response.success.js';

const analysisRouter = Router();

const getLatestAnalysis = async (req, res, next) => {
  const latest = await AIAnalysis.findOne({ userId: req.auth._id }).sort({ createdAt: -1 });
  if (!latest) {
    return next(new Error('No analysis found', { cause: 404 }));
  }
  successResponse({ res, data: latest });
};

const getAnalysisHistory = async (req, res, next) => {
  const history = await AIAnalysis.find({ userId: req.auth._id }).sort({ createdAt: -1 }).limit(20);
  if (!history || history.length === 0) {
    return next(new Error('No history found', { cause: 404 }));
  }
  successResponse({ res, data: history });
};

analysisRouter.get("/latest", authentication, getLatestAnalysis);
analysisRouter.get("/history", authentication, getAnalysisHistory);

export default analysisRouter;
