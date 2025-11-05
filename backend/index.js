// index.js
import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer({ dest: "uploads/" });
const PORT = 3001;
const PYTHON_API = "http://127.0.0.1:8000";
const MONGO_URI = "mongodb://127.0.0.1:27017/emotion_ai";

// 🧩 Node 18+ has global fetch. For lower versions:
if (typeof fetch === "undefined") {
  global.fetch = (await import("node-fetch")).default;
}

// ---------------- SPOTIFY CONFIG ----------------
let cachedAccessToken = null;
let tokenExpirationTime = 0;

async function getAccessToken() {
  const now = Date.now();

  if (cachedAccessToken && now < tokenExpirationTime) return cachedAccessToken;

  console.log("🔑 Refreshing Spotify token...");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`
        ).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("⚠️ Spotify token refresh failed:", data);
    throw new Error("Spotify token refresh failed");
  }

  cachedAccessToken = data.access_token;
  tokenExpirationTime = now + data.expires_in * 1000;

  console.log(
    "✅ Spotify token refreshed, expires at:",
    new Date(tokenExpirationTime).toLocaleTimeString()
  );
  return cachedAccessToken;
}

async function fetchWebApi(endpoint, method = "GET", body = null) {
  const token = await getAccessToken();

  const res = await fetch(`https://api.spotify.com/${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : null,
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("⚠️ Spotify API error:", res.status, text);
    throw new Error(`Spotify API ${res.status}`);
  }

  return JSON.parse(text);
}

// Emotion → Music mood mapping
const moodMap = {
  happy: ["happy", "upbeat", "pop", "dance"],
  sad: ["sad", "acoustic", "mellow", "soft"],
  angry: ["metal", "rock", "aggressive", "rap"],
  surprise: ["electronic", "fun", "edm"],
  fear: ["chill", "ambient", "soothing"],
  disgust: ["punk", "alt rock", "grunge"],
  neutral: ["lofi", "instrumental", "study"],
};

async function getSongsForEmotion(emotion) {
  try {
    const keywords = moodMap[emotion?.toLowerCase()] || [emotion];
    const query = encodeURIComponent(keywords.join(" OR "));

    const data = await fetchWebApi(`v1/search?q=${query}&type=track&limit=5`);
    return data.tracks.items.map((track) => ({
      name: track.name,
      artists: track.artists.map((a) => a.name).join(", "),
      url: track.external_urls.spotify,
      image: track.album.images[0]?.url,
    }));
  } catch (err) {
    console.error("⚠️ Spotify fetch failed:", err.message);
    return [];
  }
}

// ---------------- MONGOOSE SETUP ----------------
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const emotionLogSchema = new mongoose.Schema({
  emotion: { type: String },
  confidence: { type: Number },
  message: { type: String },
  timestamp: { type: Date, default: Date.now },
});
const EmotionLog = mongoose.model("EmotionLog", emotionLogSchema);

// ---------------- MIDDLEWARE ----------------
app.use(cors());
app.use(express.json());

// ---------------- ROUTES ----------------
app.get("/", (req, res) => {
  res.json({ status: "✅ Node backend running" });
});

// Upload frame → FastAPI → MongoDB → Spotify
app.post("/upload_frame", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const fileBuffer = fs.readFileSync(req.file.path);
    console.log("📤 Sending image to FastAPI:", fileBuffer.length, "bytes");

    const response = await fetch(`${PYTHON_API}/analyze_frame`, {
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: fileBuffer,
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("⚠️ FastAPI returned non-JSON:", text);
      throw new Error("FastAPI returned invalid JSON");
    }

    console.log("📦 From FastAPI:", data);

    let songs = [];
    if (data.emotion) {
      await EmotionLog.create({
        emotion: data.emotion,
        confidence: data.confidence || 0,
        message: data.message || "",
      });
      songs = await getSongsForEmotion(data.emotion);
    }

    res.json({ ...data, songs });
  } catch (err) {
    console.error("❌ /upload_frame error:", err);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: err.message });
  } finally {
    if (req.file && fs.existsSync(req.file.path))
      fs.unlink(req.file.path, () => {});
  }
});

// Capture one frame via FastAPI backend camera
app.get("/capture_and_analyze", async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_API}/capture_and_analyze`);
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("⚠️ FastAPI invalid response:", text);
      throw new Error("FastAPI returned invalid JSON");
    }

    let songs = [];
    if (data.emotion) {
      await EmotionLog.create({
        emotion: data.emotion,
        confidence: data.confidence || 0,
        message: data.message || "",
      });
      songs = await getSongsForEmotion(data.emotion);
    }

    res.json({ ...data, songs });
  } catch (err) {
    console.error("❌ /capture_and_analyze error:", err);
    res
      .status(500)
      .json({ error: "Failed to capture and analyze", details: err.message });
  }
});

// Analytics
app.get("/recent", async (_, res) =>
  res.json(await EmotionLog.find().sort({ timestamp: -1 }).limit(20))
);
app.get("/top", async (_, res) =>
  res.json(
    await EmotionLog.aggregate([
      { $group: { _id: "$emotion", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ])
  )
);

// Average confidence and counts per emotion
app.get("/stats", async (req, res) => {
  try {
    const agg = await EmotionLog.aggregate([
      {
        $group: {
          _id: "$emotion",
          avg_confidence: { $avg: "$confidence" },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json(agg);
  } catch (err) {
    console.error("❌ Error in /stats:", err);
    res.status(500).json({ error: "Failed to calculate stats" });
  }
});
 

// ---------------- START ----------------
app.listen(PORT, () =>
  console.log(`🚀 Node backend running on http://localhost:${PORT}`)
);
