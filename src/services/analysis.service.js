import axios from 'axios';
import moodModel from '../DB/models/mood.model.js';
import EEGReading from '../DB/models/EEGReading.model.js';
import Session from '../DB/models/Session.js';
import AIAnalysis from '../DB/models/AIAnalysis.model.js';
import { getIO } from '../socket/index.js';

export const triggerRealtimeAnalysis = (userId, eegSessionId = null) => {
  Promise.all([
    moodModel.find({ user: userId }).sort({ createdAt: -1 }).limit(10),
    eegSessionId 
      ? EEGReading.find({ sessionId: eegSessionId, userId })
      : EEGReading.findOne({ userId }).sort({ timestamp: -1 }).then(latest => 
          latest ? EEGReading.find({ sessionId: latest.sessionId, userId }) : []
        ),
    Session.findOne({ user: userId }).sort({ updatedAt: -1 })
  ])
  .then(([moodLogs, eegReadings, recentSession]) => {
    let eegMetrics = { excitement: 0, stress: 0, focus: 0, relaxation: 0, engagement: 0, interest: 0 };
    let sessionId = eegSessionId || (eegReadings.length > 0 ? eegReadings[0].sessionId : null);

    if (eegReadings && eegReadings.length > 0) {
      const sums = { excitement: 0, stress: 0, focus: 0, relaxation: 0, engagement: 0, interest: 0, longTermExcitement: 0 };
      const counts = { excitement: 0, stress: 0, focus: 0, relaxation: 0, engagement: 0, interest: 0, longTermExcitement: 0 };
      
      for (const reading of eegReadings) {
        if (reading.metrics?.excitement !== null && reading.metrics?.excitement !== undefined) { sums.excitement += reading.metrics.excitement; counts.excitement++; }
        if (reading.metrics?.stress !== null && reading.metrics?.stress !== undefined) { sums.stress += reading.metrics.stress; counts.stress++; }
        if (reading.metrics?.focus !== null && reading.metrics?.focus !== undefined) { sums.focus += reading.metrics.focus; counts.focus++; }
        if (reading.metrics?.relaxation !== null && reading.metrics?.relaxation !== undefined) { sums.relaxation += reading.metrics.relaxation; counts.relaxation++; }
        if (reading.metrics?.engagement !== null && reading.metrics?.engagement !== undefined) { sums.engagement += reading.metrics.engagement; counts.engagement++; }
        if (reading.metrics?.interest !== null && reading.metrics?.interest !== undefined) { sums.interest += reading.metrics.interest; counts.interest++; }
        if (reading.metrics?.longTermExcitement !== null && reading.metrics?.longTermExcitement !== undefined) { sums.longTermExcitement += reading.metrics.longTermExcitement; counts.longTermExcitement++; }
      }
      
      for (const key in sums) {
        eegMetrics[key] = counts[key] > 0 ? (sums[key] / counts[key]) : 0;
      }
    }

    let recentMessages = [];
    let conversationId = null;
    if (recentSession && recentSession.messages) {
      conversationId = recentSession._id;
      recentMessages = recentSession.messages
        .filter(m => m.role === 'user')
        .slice(-10)
        .map(m => ({ _id: m._id, content: m.content, timestamp: m.timestamp }));
    }

    const mappedMoodLogs = moodLogs.map(m => ({
      _id: m._id,
      mood: m.mood,
      intensity: m.intensity,
      notes: m.notes,
      timestamp: m.createdAt
    }));

    return axios.post(`${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/analyze/realtime`, {
      userId,
      moodLogs: mappedMoodLogs,
      eegMetrics,
      recentMessages
    }).then(response => {
      const aiResponse = response.data;
      const newAnalysis = new AIAnalysis({
        userId,
        type: "realtime",
        linkedMoodLogs: mappedMoodLogs.map(m => m._id),
        linkedEEGSession: sessionId,
        linkedConversation: conversationId,
        result: {
          ...aiResponse,
          eegMetrics
        }
      });

      return newAnalysis.save();
    }).then(savedAnalysis => {
      getIO().to(userId.toString()).emit('analysis:update', savedAnalysis);
      return savedAnalysis;
    });
  })
  .catch(err => console.error('Analysis trigger failed:', err));
};
