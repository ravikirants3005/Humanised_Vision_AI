import React, { useEffect, useRef, useState } from "react";
import { useEmotionAPI } from "../hooks/useEmotionAPI";

export default function CaptureCard() {
    const { emotionData, analyzeFrame } = useEmotionAPI();
    const [songs, setSongs] = useState([]);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        navigator.mediaDevices
            .getUserMedia({ video: true })
            .then((stream) => {
                if (videoRef.current) videoRef.current.srcObject = stream;
            })
            .catch((err) => console.error("Camera access denied:", err));
    }, []);

    const handleCapture = async () => {
        const ctx = canvasRef.current.getContext("2d");
        ctx.drawImage(videoRef.current, 0, 0, 640, 480);
        const blob = await new Promise((res) => canvasRef.current.toBlob(res, "image/jpeg"));

        if (blob) {
            const result = await analyzeFrame(blob);
            if (result?.songs) {
                setSongs(result.songs.slice(0, 5)); // show top 5 songs
            } else {
                setSongs([]);
            }
        }
    };

    return (
        <div className="bg-gray-900 rounded-2xl shadow-lg p-6 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-7xl mx-auto">
            {/* 🎥 LEFT: Camera + Analysis */}
            <div className="flex flex-col items-center">
                <h2 className="text-2xl font-bold text-cyan-400 mb-4">📸 Capture & Analyze</h2>

                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    width="640"
                    height="480"
                    className="rounded-xl border border-cyan-500 shadow-md"
                />
                <canvas ref={canvasRef} width="640" height="480" className="hidden" />

                <button
                    onClick={handleCapture}
                    className="mt-4 px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition"
                >
                    Capture & Analyze
                </button>

                {emotionData && (
                    <div className="mt-4 text-center bg-gray-800 p-4 rounded-lg shadow-md w-full">
                        <h3 className="text-lg font-semibold text-cyan-300 capitalize">
                            {emotionData.emotion || "No face detected"}
                        </h3>
                        <p className="text-gray-400">
                            Confidence: {(emotionData.confidence * 100).toFixed(1)}%
                        </p>
                        <p className="text-green-400">{emotionData.message}</p>
                    </div>
                )}
            </div>

            {/* 🎧 RIGHT: Recommended Songs */}
            <div className="flex flex-col">
                <h2 className="text-2xl font-bold text-cyan-400 mb-4 text-center">
                    🎧 Recommended Songs
                </h2>

                {songs.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                        {songs.map((song, index) => (
                            <a
                                key={index}
                                href={song.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-gray-800 hover:bg-gray-700 transition-all p-3 rounded-xl shadow-md flex flex-col items-center"
                            >
                                <img
                                    src={song.image}
                                    alt={song.name}
                                    className="w-full h-36 object-cover rounded-md mb-2"
                                />
                                <p className="text-white text-sm font-semibold text-center truncate">
                                    {song.name}
                                </p>
                                <p className="text-gray-400 text-xs text-center truncate">
                                    {song.artists}
                                </p>
                            </a>
                        ))}
                    </div>
                ) : (
                    <div className="text-gray-500 text-center mt-10">
                        Capture an image to get your mood-based music 🎵
                    </div>
                )}
            </div>
        </div>
    );
}
