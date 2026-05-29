import { Router } from "express";
import multer from "multer";
import { authentication } from "../../common/middleware/authentication.js";
import * as eegService from './eeg.service.js';

const upload = multer({ storage: multer.memoryStorage() });
const eegRouter = Router();

const uploadEEGData = async (req, res, next) => {
  eegService.uploadEEGData(req, res, next);
};

const getSessionData = async (req, res, next) => {
  eegService.getSessionData(req, res, next).catch(next);
};

const getLatestReading = async (req, res, next) => {
  eegService.getLatestReading(req, res, next).catch(next);
};

eegRouter.post("/upload", authentication, upload.single('file'), uploadEEGData);
eegRouter.get("/session/:sessionId", authentication, getSessionData);
eegRouter.get("/latest", authentication, getLatestReading);

export default eegRouter;
