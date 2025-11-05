import React, { useEffect } from "react";
import { useEmotionAPI } from "../hooks/useEmotionAPI";

export default function LiveCard() {
    const { isLive, startLive, stopLive, fetchLiveData, liveStats } = useEmotionAPI();

    useEffect(() => {
        let interval;
        if (isLive) interval = setInterval(fetchLiveData, 2000);
        return () => clearInterval(interval);
    }, [isLive]);

    return (
        <div className="bg-gray-800 rounded-2xl shadow-lg p-5 flex flex-col items-center">
            <h2 className="text-xl font-bold text-green-400 mb-3">🎥 Live Detection</h2>

            {isLive ? (
                <img
                    src="http://127.0.0.1:8000/video_feed"
                    alt="Live Feed"
                    width="640"
                    height="480"
                    className="rounded-xl border border-green-400"
                />
            ) : (
                <div className="w-[640px] h-[480px] flex items-center justify-center text-gray-500 border border-gray-700 rounded-xl">
                    Live feed not running
                </div>
            )}

            <div className="flex gap-4 mt-4">
                {!isLive ? (
                    <button
                        onClick={startLive}
                        className="px-5 py-2 bg-green-500 hover:bg-green-400 text-black font-semibold rounded-lg transition"
                    >
                        Start Live
                    </button>
                ) : (
                    <button
                        onClick={stopLive}
                        className="px-5 py-2 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-lg transition"
                    >
                        Stop Live
                    </button>
                )}
            </div>

            {liveStats && (
                <div className="mt-4 text-center">
                    <h3 className="text-lg font-semibold text-green-300">
                        {liveStats.emotion || "No face detected"}
                    </h3>
                    <p className="text-gray-400">
                        Confidence: {(liveStats.confidence * 100).toFixed(1)}%
                    </p>
                    <p className="text-green-400">{liveStats.message}</p>
                </div>
            )}
        </div>
    );
}
