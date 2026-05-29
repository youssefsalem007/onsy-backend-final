"""
ONSY AI Engine - FastAPI NLP Microservice
Handles: Emotion detection, Sentiment analysis, Mental level classification
Models: HuggingFace Transformers (emotion + sentiment) + rule-based scoring
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
import re
import math

# ── Lazy-load heavy models so startup is fast ──────────────────────────────
_emotion_pipeline = None
_sentiment_pipeline = None


def get_emotion_pipeline():
    global _emotion_pipeline
    if _emotion_pipeline is None:
        from transformers import pipeline
        print("Loading emotion model...")
        _emotion_pipeline = pipeline(
            "text-classification",
            model="j-hartmann/emotion-english-distilroberta-base",
            top_k=None,
            device=-1  # CPU; change to 0 for GPU
        )
    return _emotion_pipeline


def get_sentiment_pipeline():
    global _sentiment_pipeline
    if _sentiment_pipeline is None:
        from transformers import pipeline
        print("Loading sentiment model...")
        _sentiment_pipeline = pipeline(
            "sentiment-analysis",
            model="cardiffnlp/twitter-roberta-base-sentiment-latest",
            device=-1
        )
    return _sentiment_pipeline


# ── FastAPI app ────────────────────────────────────────────────────────────
app = FastAPI(title="ONSY AI Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class TextInput(BaseModel):
    text: str
    context: Optional[str] = None  # optional previous messages for context

class RealtimeInput(BaseModel):
    userId: str
    moodLogs: list[dict] = []
    eegMetrics: dict = {}
    recentMessages: list[dict] = []


class AnalysisResult(BaseModel):
    dominant_emotion: str
    sentiment: str
    sentiment_score: float
    mental_level: int
    risk_score: float
    emotions: dict
    keywords: list[str]
    recommendations: list[str]


# ── Emotion label mapping ──────────────────────────────────────────────────
# Maps model's labels → our 8 canonical emotion keys
LABEL_MAP = {
    "joy": "happiness",
    "happiness": "happiness",
    "sadness": "sadness",
    "anger": "anger",
    "fear": "fear",
    "anxiety": "anxiety",
    "disgust": "disgust",
    "surprise": "surprise",
    "neutral": "neutral",
    "optimism": "happiness",
    "anticipation": "surprise",
    "trust": "happiness",
}

# High-risk phrases (Columbia Scale inspired)
CRISIS_PHRASES = [
    "kill myself", "end my life", "suicide", "want to die", "hurt myself",
    "no reason to live", "better off dead", "can't go on", "end it all",
    "take my own life", "self harm", "cut myself", "overdose"
]

# PHQ-9 / GAD-7 inspired keyword scoring
DISTRESS_KEYWORDS = {
    "hopeless": 8, "worthless": 8, "empty": 7, "numb": 7,
    "depressed": 7, "despair": 8, "alone": 5, "lonely": 5,
    "panic": 7, "terrified": 7, "paralyzed": 6,
    "crying": 6, "tears": 5, "breakdown": 7,
    "exhausted": 4, "tired": 3, "stressed": 4, "overwhelmed": 5,
    "worried": 4, "nervous": 4, "anxious": 5,
}


def extract_keywords(text: str) -> list[str]:
    """Extract emotionally significant keywords from text."""
    lower = text.lower()
    found = []
    for kw in list(DISTRESS_KEYWORDS.keys()) + CRISIS_PHRASES:
        if kw in lower:
            found.append(kw)
    return list(set(found))[:10]


def compute_risk_score(emotions: dict, sentiment_score: float, keywords: list[str], text: str) -> float:
    """
    Composite risk score 0–100 inspired by PHQ-9 + GAD-7 + DASS-21 logic.
    """
    lower = text.lower()

    # Crisis override
    if any(p in lower for p in CRISIS_PHRASES):
        return 90.0

    score = 0.0

    # Emotion contributions
    score += emotions.get("sadness", 0) * 25
    score += emotions.get("anxiety", 0) * 20
    score += emotions.get("fear", 0) * 15
    score += emotions.get("anger", 0) * 10
    score += emotions.get("disgust", 0) * 8

    # Negative sentiment pushes score up
    if sentiment_score < 0:
        score += abs(sentiment_score) * 20

    # Keyword bonus
    for kw in keywords:
        score += DISTRESS_KEYWORDS.get(kw, 3)

    # Happiness reduces risk
    score -= emotions.get("happiness", 0) * 15

    return max(0.0, min(100.0, round(score, 1)))


def classify_mental_level(risk_score: float, emotions: dict, text: str) -> int:
    """
    4-level classification:
    1 = Normal, 2 = Mild, 3 = Moderate, 4 = High risk
    """
    lower = text.lower()
    if any(p in lower for p in CRISIS_PHRASES):
        return 4
    if risk_score >= 65:
        return 4
    if risk_score >= 40:
        return 3
    if risk_score >= 20:
        return 2
    return 1


def build_recommendations(level: int, dominant_emotion: str) -> list[str]:
    """Generate actionable, non-clinical recommendations."""
    base = {
        1: [
            "Keep up your positive habits — you're doing well!",
            "Stay connected with people who bring you joy.",
            "Consider journaling to track your emotional patterns."
        ],
        2: [
            "Take a 10-minute break and practice deep breathing.",
            "Try a short walk or light physical activity.",
            "Limit screen time before bed to improve sleep quality.",
            "Talk to a friend about how you're feeling."
        ],
        3: [
            "Reach out to a trusted friend or family member today.",
            "Consider speaking with a counselor or therapist.",
            "Practice grounding exercises (5-4-3-2-1 technique).",
            "Be gentle with yourself — it's okay to not be okay."
        ],
        4: [
            "⚠️ Please reach out to a mental health professional as soon as possible.",
            "If you're in immediate distress, contact a crisis helpline.",
            "You don't have to face this alone — help is available.",
            "Global Crisis Line: https://www.befrienders.org"
        ]
    }
    return base.get(level, base[1])


@app.get("/")
def root():
    return {"message": "ONSY AI Engine is running", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalysisResult)
def analyze(input: TextInput):
    """
    Main NLP analysis endpoint.
    1. Emotion detection (DistilRoBERTa)
    2. Sentiment analysis (Twitter-RoBERTa)
    3. Risk scoring (composite)
    4. Mental level classification
    5. Recommendations
    """
    text = input.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    # ── Emotion detection ──────────────────────────────────────────────────
    try:
        raw_emotions = get_emotion_pipeline()(text)[0]
        emotions = {}
        for item in raw_emotions:
            mapped = LABEL_MAP.get(item["label"].lower(), item["label"].lower())
            emotions[mapped] = round(item["score"], 4)
    except Exception as e:
        print(f"Emotion model error: {e}")
        # Fallback: keyword-based emotion scores
        emotions = _keyword_emotions(text)

    # Ensure all 8 emotion keys exist
    for key in ["happiness", "sadness", "anger", "fear", "anxiety", "stress", "surprise", "disgust"]:
        emotions.setdefault(key, 0.0)

    dominant_emotion = max(emotions, key=emotions.get)

    # ── Sentiment analysis ─────────────────────────────────────────────────
    try:
        sentiment_raw = get_sentiment_pipeline()(text[:512])[0]
        label = sentiment_raw["label"].lower()
        confidence = sentiment_raw["score"]

        if "positive" in label or "pos" in label:
            sentiment = "positive"
            sentiment_score = confidence
        elif "negative" in label or "neg" in label:
            sentiment = "negative"
            sentiment_score = -confidence
        else:
            sentiment = "neutral"
            sentiment_score = 0.0
    except Exception as e:
        print(f"Sentiment model error: {e}")
        sentiment, sentiment_score = _keyword_sentiment(text)

    # ── Risk + Classification ──────────────────────────────────────────────
    keywords = extract_keywords(text)
    risk_score = compute_risk_score(emotions, sentiment_score, keywords, text)
    mental_level = classify_mental_level(risk_score, emotions, text)
    recommendations = build_recommendations(mental_level, dominant_emotion)

    return AnalysisResult(
        dominant_emotion=dominant_emotion,
        sentiment=sentiment,
        sentiment_score=round(sentiment_score, 4),
        mental_level=mental_level,
        risk_score=risk_score,
        emotions=emotions,
        keywords=keywords,
        recommendations=recommendations
    )

@app.post("/analyze/realtime", response_model=AnalysisResult)
def analyze_realtime(input: RealtimeInput):
    """
    Real-time multimodal analysis endpoint.
    Aggregates recent messages, mood logs, and EEG metrics.
    """
    # 1. Combine text
    text_parts = [m.get("content", "") for m in input.recentMessages if m.get("content")]
    text_parts += [m.get("notes", "") for m in input.moodLogs if m.get("notes")]
    combined_text = " ".join(text_parts).strip()
    
    if not combined_text:
        combined_text = "I am feeling okay"  # Neutral fallback text

    # 2. Get baseline text analysis
    base_result = analyze(TextInput(text=combined_text))
    
    # 3. Adjust risk score using EEG metrics and Mood ratings
    adjusted_risk = base_result.risk_score
    
    # Factor in EEG Stress and Relaxation (0 to 1 scale)
    eeg_stress = input.eegMetrics.get("stress", 0.0)
    eeg_relax = input.eegMetrics.get("relaxation", 0.0)
    
    if eeg_stress > 0.5:
        adjusted_risk += (eeg_stress * 15)
    if eeg_relax > 0.5:
        adjusted_risk -= (eeg_relax * 15)
        
    # Factor in raw mood logs (assuming 1-5 scale, 1 being worst, 5 being best)
    if input.moodLogs:
        avg_mood = sum(m.get("mood", 3) for m in input.moodLogs) / len(input.moodLogs)
        if avg_mood <= 2:
            adjusted_risk += 10
        elif avg_mood >= 4:
            adjusted_risk -= 10

    adjusted_risk = max(0.0, min(100.0, round(adjusted_risk, 1)))
    
    # 4. Re-classify mental level and recommendations based on new risk
    new_level = classify_mental_level(adjusted_risk, base_result.emotions, combined_text)
    new_recs = build_recommendations(new_level, base_result.dominant_emotion)

    return AnalysisResult(
        dominant_emotion=base_result.dominant_emotion,
        sentiment=base_result.sentiment,
        sentiment_score=base_result.sentiment_score,
        mental_level=new_level,
        risk_score=adjusted_risk,
        emotions=base_result.emotions,
        keywords=base_result.keywords,
        recommendations=new_recs
    )


# ── Keyword fallbacks (no model required) ─────────────────────────────────
def _keyword_emotions(text: str) -> dict:
    lower = text.lower()
    def has(*words): return any(w in lower for w in words)
    return {
        "happiness": 0.7 if has("happy", "joy", "great", "excited", "wonderful") else 0.05,
        "sadness":   0.7 if has("sad", "depressed", "cry", "hopeless", "empty") else 0.05,
        "anger":     0.7 if has("angry", "furious", "rage", "hate") else 0.05,
        "fear":      0.6 if has("scared", "terrified", "afraid", "fear") else 0.05,
        "anxiety":   0.7 if has("anxious", "worried", "panic", "nervous") else 0.05,
        "stress":    0.6 if has("stressed", "overwhelmed", "tired", "exhausted") else 0.05,
        "surprise":  0.3 if has("surprised", "shocked", "wow") else 0.05,
        "disgust":   0.3 if has("disgusted", "gross", "awful") else 0.05,
    }


def _keyword_sentiment(text: str) -> tuple:
    lower = text.lower()
    pos = sum(1 for w in ["good", "happy", "great", "love", "amazing"] if w in lower)
    neg = sum(1 for w in ["bad", "sad", "hate", "terrible", "awful", "hopeless"] if w in lower)
    if pos > neg: return "positive", 0.65
    if neg > pos: return "negative", -0.65
    return "neutral", 0.0


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
