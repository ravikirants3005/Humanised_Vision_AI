import React, { useEffect, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    LineChart,
    Line,
    Legend,
} from "recharts";
import { useEmotionAPI } from "../hooks/useEmotionAPI";

export default function DashboardCard() {
    const { fetchStats, fetchTop, fetchRecent } = useEmotionAPI();
    const [stats, setStats] = useState([]);
    const [top, setTop] = useState([]);
    const [recent, setRecent] = useState([]);

    // Derived stats
    const totalDetections = recent.length;
    const topEmotion = top[0]?._id || "N/A";
    const avgConfidence =
        stats.length > 0
            ? (
                stats.reduce((sum, s) => sum + s.avg_confidence * 100, 0) /
                stats.length
            ).toFixed(1)
            : 0;

    useEffect(() => {
        const loadData = async () => {
            setStats(await fetchStats());
            setTop(await fetchTop());
            setRecent(await fetchRecent());
        };
        loadData();

        // Auto-refresh every 10s
        const interval = setInterval(loadData, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-gray-800 rounded-2xl shadow-lg p-8 w-full">
            <h2 className="text-2xl font-bold text-yellow-400 mb-8 text-center">
                📊 Emotion Analytics Dashboard
            </h2>

            {/* ==== SUMMARY CARDS ==== */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
                <div className="bg-gray-900/60 p-5 rounded-xl shadow-md text-center border border-cyan-500/30 hover:shadow-cyan-500/30 transition">
                    <h3 className="text-gray-400 text-sm">Total Detections</h3>
                    <p className="text-3xl font-bold text-cyan-400 mt-1">{totalDetections}</p>
                </div>

                <div className="bg-gray-900/60 p-5 rounded-xl shadow-md text-center border border-green-500/30 hover:shadow-green-500/30 transition">
                    <h3 className="text-gray-400 text-sm">Most Common Emotion</h3>
                    <p className="text-3xl font-bold text-green-400 mt-1 capitalize">
                        {topEmotion}
                    </p>
                </div>

                <div className="bg-gray-900/60 p-5 rounded-xl shadow-md text-center border border-yellow-500/30 hover:shadow-yellow-500/30 transition">
                    <h3 className="text-gray-400 text-sm">Avg. Confidence</h3>
                    <p className="text-3xl font-bold text-yellow-400 mt-1">
                        {avgConfidence}%
                    </p>
                </div>
            </div>

            {/* ==== TOP EMOTIONS BAR CHART ==== */}
            <div className="w-full mb-10 bg-gray-900/40 p-4 rounded-xl shadow-inner">
                <h3 className="text-cyan-300 font-semibold mb-3 text-center">
                    Top Emotions
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={top} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                        <XAxis dataKey="_id" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#1f2937",
                                border: "none",
                                color: "#fff",
                            }}
                        />
                        <Bar dataKey="count" fill="#06b6d4" barSize={40} radius={[6, 6, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* ==== AVERAGE CONFIDENCE CHART ==== */}
            <div className="w-full mb-10 bg-gray-900/40 p-4 rounded-xl shadow-inner">
                <h3 className="text-cyan-300 font-semibold mb-3 text-center">
                    Average Confidence per Emotion
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart
                        data={stats.map((s) => ({
                            emotion: s._id,
                            confidence: (s.avg_confidence * 100).toFixed(1),
                        }))}
                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                        <XAxis dataKey="emotion" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" domain={[0, 100]} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#1f2937",
                                border: "none",
                                color: "#fff",
                            }}
                        />
                        <Legend wrapperStyle={{ color: "#fff" }} />
                        <Line
                            type="monotone"
                            dataKey="confidence"
                            stroke="#22c55e"
                            strokeWidth={3}
                            dot={{ r: 5, fill: "#22c55e" }}
                            activeDot={{ r: 7 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* ==== RECENT DETECTIONS ==== */}
            <div className="w-full">
                <h3 className="text-cyan-300 font-semibold mb-3 text-center">
                    Recent Detections
                </h3>
                <div className="max-h-48 overflow-y-auto space-y-2 text-gray-400 bg-gray-900/40 rounded-lg p-4 border border-gray-700">
                    {recent.map((r) => (
                        <div
                            key={r._id}
                            className="flex justify-between items-center border-b border-gray-700 pb-1"
                        >
                            <span className="capitalize text-lg text-white">{r.emotion}</span>
                            <div className="text-right">
                                <span className="text-yellow-400 text-sm">
                                    {(r.confidence * 100).toFixed(1)}%
                                </span>
                                <br />
                                <span className="text-xs text-gray-500">
                                    {new Date(r.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                        </div>
                    ))}
                    {recent.length === 0 && (
                        <p className="text-center text-gray-500">No detections yet...</p>
                    )}
                </div>
            </div>
        </div>
    );
}
