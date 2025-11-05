import React from "react";
import CaptureCard from "./components/CaptureCard";
// import LiveCard from "./components/LiveCard";
import DashboardCard from "./components/DashboardCard";

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-800 text-white font-sans">
      {/* ---------- HEADER ---------- */}
      <header className="w-full bg-gray-900/70 backdrop-blur-md border-b border-cyan-500/20 shadow-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
          <h1 className="text-2xl font-bold text-cyan-400 tracking-wide">
            🤖 Humanised Vision AI
          </h1>
          <p className="text-gray-400 text-sm hidden sm:block">
            Real-time Emotion Detection and Analytics Dashboard
          </p>
        </div>
      </header>

      {/* ---------- MAIN CONTENT ---------- */}
      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {/* --- Dashboard Full Width --- */}
        <section id="dashboard" className="w-full">
          <DashboardCard />
        </section>

        {/* --- Capture + Live Side by Side --- */}

          <CaptureCard />
          {/* <LiveCard /> */}
      </main>

      {/* ---------- FOOTER ---------- */}
      <footer className="border-t border-gray-700/40 py-4 text-center text-gray-500 text-sm">
        Powered by{" "}
        <span className="text-cyan-400 font-semibold">Hugging Face</span> +{" "}
        <span className="text-yellow-400 font-semibold">FastAPI</span> +{" "}
        <span className="text-green-400 font-semibold">Node.js</span> +{" "}
        <span className="text-blue-400 font-semibold">MongoDB</span>
      </footer>
    </div>
  );
}
