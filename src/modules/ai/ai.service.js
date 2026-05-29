import axios from 'axios';
import Session from '../../DB/models/Session.js';
import successResponse from "../../common/utils/response.success.js";
import { AI_ENGINE_URL, GROQ_API_KEY } from "../../../config/config.service.js";
import { triggerRealtimeAnalysis } from "../../services/analysis.service.js";

const LEVEL_INFO = {
  1: { label: 'Normal',            color: 'green',  advice: 'You seem to be in a good emotional state. Keep taking care of yourself!' },
  2: { label: 'Mild stress',       color: 'yellow', advice: 'You may need some rest. Try a short break, deep breathing, or a relaxing activity.' },
  3: { label: 'Moderate distress', color: 'orange', advice: 'It sounds like you are going through a tough time. Consider talking to a trusted friend or family member.' },
  4: { label: 'High risk',         color: 'red',    advice: 'Your emotional state suggests you need professional support. Please reach out to a mental health specialist.' }
};

function buildSystemPrompt(level, userName) {
  const levelInfo = LEVEL_INFO[level] || LEVEL_INFO[1];
  return `You are ONSY, a compassionate AI mental health support chatbot. You are NOT a medical professional and must never diagnose.\n\nUser: ${userName || 'User'}\nLevel: ${level} (${levelInfo.label})\nGuidance: ${levelInfo.advice}\n\nRules:\n1. Be warm, empathetic, non-judgmental.\n2. Match tone to emotional state.\n3. Ask one follow-up question at a time.\n4. For Level 3-4: gently encourage professional help.\n5. For Level 4: always include a crisis resource.\n6. Never claim to diagnose or replace a therapist.\n7. Use CBT principles: acknowledge, validate, reframe.\n8. Keep responses to 3-5 sentences.\n9. Vary responses naturally.\n10. Reference earlier things the user said.`;
}

export const sendMessage = async (req, res, next) => {
  try {
    const { message, sessionId } = req.body;
    if (!message?.trim()) {
      return next(new Error('Message is required.', { cause: 400 }));
    }

    let analysis = null;
    try {
      const nlpRes = await axios.post(`${AI_ENGINE_URL || 'http://localhost:8000'}/analyze`, { text: message }, { timeout: 10000 });
      analysis = nlpRes.data;
    } catch (e) {
      console.warn('AI engine unavailable, using fallback');
      analysis = fallbackAnalysis(message);
    }

    const mentalLevel = analysis.mental_level || 1;
    const systemPrompt = buildSystemPrompt(mentalLevel, req.auth.firstName);

    let session;
    if (sessionId) {
      session = await Session.findOne({ _id: sessionId, user: req.auth._id });
    }
    if (!session) {
      session = new Session({ user: req.auth._id, messages: [] });
    }

    const history = session.messages.slice(-10).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

    const groqRes = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        max_tokens: 600,
        temperature: 0.75,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: message }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const reply = groqRes.data.choices[0].message.content;

    session.messages.push({ role: 'user', content: message, analysis });
    session.messages.push({ role: 'assistant', content: reply });
    session.updatedAt = Date.now();
    await session.save();

    triggerRealtimeAnalysis(req.auth._id);

    successResponse({
      res,
      status: 200,
      message: "Message sent",
      data: {
        reply,
        sessionId: session._id,
        analysis: {
          dominant_emotion: analysis.dominant_emotion,
          sentiment: analysis.sentiment,
          mental_level: mentalLevel,
          level_label: LEVEL_INFO[mentalLevel]?.label,
          level_color: LEVEL_INFO[mentalLevel]?.color,
          risk_score: analysis.risk_score,
          emotions: analysis.emotions
        }
      }
    });

  } catch (err) {
    next(err);
  }
};

export const newSession = async (req, res, next) => {
  try {
    const session = await Session.create({ user: req.auth._id, messages: [] });
    successResponse({
      res,
      status: 201,
      message: "New session created",
      data: { sessionId: session._id }
    });
  } catch (err) {
    next(err);
  }
};

function fallbackAnalysis(text) {
  const lower = text.toLowerCase();
  const isSad    = ['sad','depressed','cry','hopeless','empty','lonely'].some(w => lower.includes(w));
  const isAnx    = ['anxious','worried','panic','nervous','scared','fear'].some(w => lower.includes(w));
  const isStress = ['stressed','overwhelmed','tired','exhausted'].some(w => lower.includes(w));
  const isHappy  = ['happy','good','great','excited','joy', 'glad'].some(w => lower.includes(w));
  const isRisk   = ['suicide','die','hurt myself','end it', 'kill myself', 'kill'].some(w => lower.includes(w));
  let level = 1;
  if (isRisk) level = 4;
  else if (isSad || isAnx) level = 3;
  else if (isStress) level = 2;
  let happiness = isHappy ? 0.7 : 0.05;
  let sadness = isSad ? 0.6 : 0.05;
  let anxiety = isAnx ? 0.5 : 0.05;
  let stress = isStress ? 0.5 : 0.05;
  let anger = 0.05;
  let fear = isAnx ? 0.3 : 0.05;

  if (!isRisk && !isSad && !isAnx && !isStress && !isHappy) {
    happiness = 0.2; sadness = 0.1; anxiety = 0.1; stress = 0.1; anger = 0.1; fear = 0.1;
  }

  const sum = happiness + sadness + anxiety + stress + anger + fear;
  
  return {
    dominant_emotion: isRisk ? 'distress' : isSad ? 'sadness' : isAnx ? 'anxiety' : isStress ? 'stress' : isHappy ? 'happiness' : 'neutral',
    sentiment: isHappy ? 'positive' : (isSad || isAnx || isRisk) ? 'negative' : 'neutral',
    sentiment_score: isHappy ? 0.7 : (isSad || isRisk) ? -0.8 : 0,
    mental_level: level,
    risk_score: isRisk ? 85 : isSad ? 55 : isAnx ? 45 : isStress ? 30 : 10,
    emotions: {
      happiness: +(happiness / sum).toFixed(3),
      sadness: +(sadness / sum).toFixed(3),
      anxiety: +(anxiety / sum).toFixed(3),
      stress: +(stress / sum).toFixed(3),
      anger: +(anger / sum).toFixed(3),
      fear: +(fear / sum).toFixed(3)
    }
  };
}

export const allSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({ user: req.auth._id })
      .sort({ updatedAt: -1 })
      .select('_id createdAt updatedAt summary messages')
      .lean();

    const result = sessions.map(s => ({
      id: s._id,
      date: s.updatedAt,
      messageCount: s.messages.length,
      preview: s.messages.find(m => m.role === 'user')?.content?.slice(0, 60) + '...' || '',
      avgLevel: s.summary?.dominant_level || null
    }));

    successResponse({
      res,
      status: 200,
      message: "All sessions",
      data: result
    });
  } catch (err) {
    next(err);
  }
};

export const oneSession = async (req, res, next) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, user: req.auth._id });
    if (!session) {
      return next(new Error('Session not found.', { cause: 404 }));
    }
    successResponse({
      res,
      status: 200,
      message: "Session retrieved",
      data: session
    });
  } catch (err) {
    next(err);
  }
};

export const emotionalTrend = async (req, res, next) => {
  try {
    const sessions = await Session.find({ user: req.auth._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const userMessages = sessions.flatMap(s =>
      s.messages.filter(m => m.role === 'user' && m.analysis)
    );

    if (!userMessages.length) {
      return successResponse({
        res,
        status: 200,
        message: "No message data available",
        data: { empty: true }
      });
    }

    const avgRisk = userMessages.reduce((sum, m) => sum + (m.analysis.risk_score || 0), 0) / userMessages.length;
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    const levelCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };

    userMessages.forEach(m => {
      if (m.analysis.sentiment) sentimentCounts[m.analysis.sentiment]++;
      if (m.analysis.mental_level) levelCounts[m.analysis.mental_level]++;
    });

    const emotionTotals = {};
    userMessages.forEach(m => {
      if (m.analysis.emotions) {
        Object.entries(m.analysis.emotions).forEach(([k, v]) => {
          emotionTotals[k] = (emotionTotals[k] || 0) + v;
        });
      }
    });
    const avgEmotions = Object.fromEntries(
      Object.entries(emotionTotals).map(([k, v]) => [k, +(v / userMessages.length).toFixed(3)])
    );

    successResponse({
      res,
      status: 200,
      message: "Emotional trend",
      data: {
        avgRisk: +avgRisk.toFixed(1),
        sentimentCounts,
        levelCounts,
        avgEmotions,
        totalMessages: userMessages.length
      }
    });
  } catch (err) {
    next(err);
  }
};