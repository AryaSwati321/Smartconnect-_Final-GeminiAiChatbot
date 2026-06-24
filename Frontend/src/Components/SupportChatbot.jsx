import { useMemo, useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";

export default function SupportChatbot() {
  const { isAuthenticated, token, user: _user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // Initialize chatbot on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isAuthenticated && open && messages.length === 0) {
      initializeChat();
    }
  }, [isAuthenticated, open]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const initializeChat = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/chatbot/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages([
          {
            role: "bot",
            text: data.initialMessage,
            timestamp: new Date(),
          },
        ]);
      } else {
        setMessages([
          {
            role: "bot",
            text: "👋 Welcome to Smart Connect AI Assistant! How can I help you today?",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err) {
      console.error("Failed to initialize chat:", err);
      setMessages([
        {
          role: "bot",
          text: "👋 Welcome to Smart Connect AI Assistant! How can I help you today?",
          timestamp: new Date(),
        },
      ]);
    }
  };

  const canSend = useMemo(() => input.trim().length > 0 && !loading && isAuthenticated, [input, loading, isAuthenticated]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!canSend) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message to chat
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text: userMessage,
        timestamp: new Date(),
      },
    ]);

    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/chatbot/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: data.reply,
            timestamp: new Date(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: "Sorry, I couldn't process your request. Please try again.",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Network error. Please check your connection and try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickQuestion = (question) => {
    setInput(question);
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center justify-center h-14 w-14 rounded-full bg-gradient-to-br from-indigo-600 to-blue-500 text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300"
          title="Chat is only available when logged in"
        >
          <span className="text-xl">💬</span>
        </button>
        {open && (
          <div className="absolute bottom-20 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 text-center">
            <p className="text-slate-700 font-semibold mb-3">
              Please log in to use AI Chat Support
            </p>
            <p className="text-sm text-slate-500">
              Sign in to get personalized assistance with bookings, tracking, and more!
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center h-14 w-14 rounded-full bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300"
        title="Chat Support"
      >
        <span className="text-xl">💬</span>
      </button>

      {/* Chat Window */}
      {open && (
        <div className="absolute bottom-20 right-0 w-96 h-screen sm:h-96 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              <div>
                <h3 className="font-semibold">Smart Connect AI</h3>
                <p className="text-xs opacity-90">Always here to help</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white hover:bg-white/20 p-1 rounded transition"
            >
              ✕
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <p className="text-lg">👋 Loading...</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-br-none"
                        : "bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm"
                    }`}
                  >
                    {msg.role === "bot" ? (
                      <div className="text-sm whitespace-pre-wrap prose prose-sm">
                        {msg.text.split("\n").map((line, i) => {
                          // Handle markdown-like formatting
                          if (line.includes("**")) {
                            return (
                              <p key={i} className="my-1">
                                {line.split("**").map((part, j) =>
                                  j % 2 === 1 ? (
                                    <strong key={j}>{part}</strong>
                                  ) : (
                                    part
                                  )
                                )}
                              </p>
                            );
                          }
                          return (
                            <p key={i} className="my-0.5">
                              {line}
                            </p>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm">{msg.text}</p>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {messages.length <= 1 && (
            <div className="px-4 py-2 border-t border-slate-200 bg-white">
              <p className="text-xs text-slate-600 mb-2 font-semibold">
                Quick Questions:
              </p>
              <div className="space-y-1">
                {[
                  "How to book a service?",
                  "How to track my booking?",
                  "How to cancel booking?",
                ].map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickQuestion(q)}
                    className="w-full text-left px-2 py-1 text-xs bg-slate-100 hover:bg-indigo-100 text-slate-700 rounded transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <form onSubmit={sendMessage} className="border-t border-slate-200 bg-white p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                disabled={loading}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 text-sm"
              />
              <button
                type="submit"
                disabled={!canSend}
                className={`px-4 py-2 rounded-lg font-semibold text-white transition ${
                  canSend
                    ? "bg-gradient-to-r from-indigo-600 to-blue-600 hover:shadow-lg"
                    : "bg-slate-300 cursor-not-allowed"
                }`}
              >
                {loading ? "..." : "Send"}
              </button>
            </div>
            {!isAuthenticated && (
              <p className="text-xs text-slate-500 mt-2">
                Please log in to use chat
              </p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
