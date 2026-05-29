import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },

  analysis: {
    emotions: {
      happiness: Number,
      sadness: Number,
      anger: Number,
      fear: Number,
      anxiety: Number,
      stress: Number,
      surprise: Number,
      disgust: Number
    },
    dominant_emotion: String,
    sentiment: { type: String, enum: ['positive', 'negative', 'neutral'] },
    sentiment_score: Number,
    mental_level: { type: Number, min: 1, max: 4 },
    risk_score: Number,
    keywords: [String]
  }
});

const sessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  messages: [messageSchema],
  summary: {
    avg_sentiment: Number,
    dominant_level: Number,
    session_risk: Number,
    recommendations: [String]
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Session = mongoose.model('Session', sessionSchema) || mongoose.models.Session;
export default Session;
