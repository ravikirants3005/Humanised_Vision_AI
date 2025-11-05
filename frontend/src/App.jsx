import React, { useState } from "react";
import CaptureCard from "./components/CaptureCard";
import DashboardCard from "./components/DashboardCard";
import ChatCard from "./components/ChatCard";

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");

  // Render the selected page
  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <DashboardCard />;
      case "capture":
        return <CaptureCard />;
      case "chat":
        return <ChatCard />;
      default:
        return <DashboardCard />;
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-950 text-white font-sans">
      {/* ---------- SIDEBAR ---------- */}
      <aside className="w-64 bg-gray-900/80 border-r border-cyan-500/20 fixed top-0 left-0 h-screen flex flex-col">
        <div className="p-6 border-b border-cyan-500/20">
          <h1 className="text-xl font-bold text-cyan-400 tracking-wide">
            🤖 Vision AI
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {[
            { key: "dashboard", label: "📊 Dashboard" },
            { key: "capture", label: "📸 Capture & Analyze" },
            { key: "chat", label: "💬 Chat Assistant" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActivePage(key)}
              className={`w-full text-left px-4 py-2 rounded-lg transition font-medium ${activePage === key
                  ? "bg-cyan-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-cyan-300"
                }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="p-4 text-center border-t border-gray-700/30 text-gray-500 text-sm">
          v1.0.0
        </div>
      </aside>

      {/* ---------- MAIN AREA ---------- */}
      <div className="flex-1 ml-64 flex flex-col">
        {/* ---------- HEADER ---------- */}
        <header className="w-full bg-gray-900/70 backdrop-blur-md border-b border-cyan-500/20 shadow-md sticky top-0 z-20">
          <div className="flex justify-between items-center px-8 py-4">
            <h2 className="text-xl font-semibold text-cyan-400 capitalize">
              {activePage === "dashboard"
                ? "📊 Emotion Dashboard"
                : activePage === "capture"
                  ? "📸 Capture & Analyze"
                  : "💬 Chat Assistant"}
            </h2>
            <p className="text-gray-400 text-sm">
              Real-time Emotion Detection System
            </p>
          </div>
        </header>

        {/* ---------- CONTENT ---------- */}
        <main className="flex-1 overflow-y-auto px-8 py-8">
          {renderPage()}
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
    </div>
  );
}
