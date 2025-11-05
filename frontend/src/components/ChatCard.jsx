import React, { useState } from "react";

export default function ChatCard() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage = { role: "user", text: input };
        setMessages((prev) => [...prev, userMessage]);
        setLoading(true);

        try {
            const res = await fetch("http://localhost:3001/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: input }),
            });

            const data = await res.json();
            const aiMessage = { role: "ai", text: data.reply };
            setMessages((prev) => [...prev, aiMessage]);
        } catch (err) {
            console.error("Chat error:", err);
            setMessages((prev) => [
                ...prev,
                { role: "ai", text: "⚠️ Failed to reach the AI assistant." },
            ]);
        } finally {
            setLoading(false);
            setInput("");
        }
    };

    return (
        <div className="bg-gray-800 p-10 rounded-2xl shadow-lg flex flex-col mx-auto h-[700px] w-full max-w-7xl">
            <h2 className="text-xl font-bold text-cyan-400 mb-3 text-center">
                💬 Chat with Monk
            </h2>

            <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-gray-900 rounded-lg mb-3">
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`p-3 rounded-xl max-w-[80%] ${msg.role === "user"
                            ? "bg-cyan-600 text-white self-end ml-auto"
                            : "bg-gray-700 text-gray-200 self-start"
                            }`}
                    >
                        {msg.text}
                    </div>
                ))}
                {loading && (
                    <div className="p-2 bg-gray-700 rounded-xl text-gray-400 w-fit">
                        Thinking...
                    </div>
                )}
            </div>

            <div className="flex gap-2">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 p-2 rounded-lg bg-gray-700 text-white border border-cyan-500 focus:outline-none"
                    placeholder="Type your message..."
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button
                    onClick={sendMessage}
                    disabled={loading}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 rounded-lg text-black font-semibold"
                >
                    {loading ? "..." : "Send"}
                </button>
            </div>
        </div>
    );
}
