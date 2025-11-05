import { useState } from "react";

const API_BASE = "http://localhost:3001";

export function useEmotionAPI() {
  const [emotionData, setEmotionData] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLive, setIsLive] = useState(false);
  const [liveStats, setLiveStats] = useState(null);

  // ---------------------- FRAME UPLOAD (Browser) ----------------------
  const analyzeFrame = async (blob) => {
    try {
      const formData = new FormData();
      formData.append("file", blob, "frame.jpg");

      const res = await fetch(`${API_BASE}/upload_frame`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      setEmotionData(data);
      if (data.emotion) {
        setHistory((prev) => [
          ...prev.slice(-19),
          { ...data, time: new Date().toLocaleTimeString() },
        ]);
      }

      return data;
    } catch (err) {
      console.error("Error in analyzeFrame:", err);
      return { error: err.message };
    }
  };

  // ---------------------- BACKEND CAPTURE ----------------------
  const captureNow = async () => {
    try {
      const res = await fetch(`${API_BASE}/capture_and_analyze`);
      const data = await res.json();
      setEmotionData(data);
      if (data.emotion) {
        setHistory((prev) => [
          ...prev.slice(-19),
          { ...data, time: new Date().toLocaleTimeString() },
        ]);
      }
      return data;
    } catch (err) {
      console.error("Error in captureNow:", err);
      return { error: err.message };
    }
  };

  // ---------------------- LIVE MODE CONTROL ----------------------
  const startLive = async () => {
    try {
      const res = await fetch(`${API_BASE}/start_live`, { method: "POST" });
      const data = await res.json();
      setIsLive(true);
      console.log("🎥 Live mode started:", data);
      return data;
    } catch (err) {
      console.error("Error in startLive:", err);
      return { error: err.message };
    }
  };

  const stopLive = async () => {
    try {
      const res = await fetch(`${API_BASE}/stop_live`, { method: "POST" });
      const data = await res.json();
      setIsLive(false);
      console.log("🛑 Live mode stopped:", data);
      return data;
    } catch (err) {
      console.error("Error in stopLive:", err);
      return { error: err.message };
    }
  };

  // ---------------------- LIVE JSON FEED ----------------------
  const fetchLiveData = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/webcam`);
      const data = await res.json();
      setLiveStats(data);
      return data;
    } catch (err) {
      console.error("Error fetching live data:", err);
      return { error: err.message };
    }
  };

  // ---------------------- ANALYTICS (MongoDB) ----------------------
  const fetchStats = async () => {
    const res = await fetch(`${API_BASE}/stats`);
    return res.json();
  };

  const fetchRecent = async () => {
    const res = await fetch(`${API_BASE}/recent`);
    return res.json();
  };

  const fetchTop = async () => {
    const res = await fetch(`${API_BASE}/top`);
    return res.json();
  };

  // ---------------------- EXPORT API ----------------------
  return {
    emotionData,
    history,
    liveStats,
    isLive,
    analyzeFrame,
    captureNow,
    startLive,
    stopLive,
    fetchLiveData,
    fetchStats,
    fetchRecent,
    fetchTop,
  };
}
