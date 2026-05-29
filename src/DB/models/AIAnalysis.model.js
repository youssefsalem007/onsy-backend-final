import mongoose from 'mongoose';

const aiAnalysisSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, default: "realtime" },
  linkedMoodLogs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Mood' }],
  linkedEEGSession: { type: String },
  linkedConversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  result: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

const AIAnalysis = mongoose.model('AIAnalysis', aiAnalysisSchema) || mongoose.models.AIAnalysis;
export default AIAnalysis;
