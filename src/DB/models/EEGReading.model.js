import mongoose from 'mongoose';

const eegReadingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: String, required: true },
  timestamp: { type: Number, required: true },
  channels: {
    AF3: Number,
    T7: Number,
    Pz: Number,
    T8: Number,
    AF4: Number
  },
  motion: {
    gyroX: Number,
    gyroY: Number
  },
  metrics: {
    excitement: Number,
    engagement: Number,
    relaxation: Number,
    interest: Number,
    stress: Number,
    focus: Number,
    longTermExcitement: Number
  }
});

const EEGReading = mongoose.model('EEGReading', eegReadingSchema) || mongoose.models.EEGReading;
export default EEGReading;
