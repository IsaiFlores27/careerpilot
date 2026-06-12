"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  { label: "Plan 7 días", text: "Crea un plan de búsqueda de empleo de 7 días para mí." },
  { label: "Mensaje en frío", text: "Ayúdame a escribir un mensaje en frío para una empresa que me interesa." },
  { label: "Carta de presentación", text: "Necesito una carta de presentación para una vacante específica." },
  { label: "Prep de entrevista", text: "Prepárame para una entrevista. ¿Qué preguntas me pueden hacer?" },
  { label: "Follow-up", text: "Escribe un mensaje de seguimiento después de una aplicación." },
];

export default function CoachPage() {
  const WELCOME: Message = {
    role: "assistant",
    content: "Hola, soy tu coach de carrera. Tengo acceso a tu CV y tu historial de postulaciones, así que mis consejos son específicos para ti.\n\n¿En qué te ayudo hoy?",
  };

  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cargar historial persistido al montar
  useEffect(() => {
    fetch("/api/coach/history")
      .then((r) => r.json())
      .then((data) => {
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text?: string) {
    const messageText = text ?? input;
    if (!messageText.trim() || loading) return;
    setInput("");

    const newMessages: Message[] = [...messages, { role: "user", content: messageText }];
    setMessages(newMessages);
    setLoading(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const history = newMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText, history }),
      });

      if (!res.ok || !res.body) throw new Error("Error en la respuesta");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "text") {
                assistantText += data.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: assistantText };
                  return updated;
                });
              }
            } catch { /* ignorar */ }
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Ocurrió un error. Por favor intenta de nuevo." };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="mb-5 shrink-0">
        <h1 className="text-2xl font-bold text-white">Coach IA</h1>
        <p className="text-white/40 text-sm mt-1">Plan · Mensajes en frío · Cartas · Prep de entrevista · Follow-ups</p>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-2">
        {loadingHistory && (
          <div className="flex justify-center py-6">
            <span className="text-xs text-white/25">Cargando historial...</span>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs text-violet-400 font-bold">C</span>
              </div>
            )}
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === "user"
                  ? "bg-violet-600/20 border border-violet-500/30 text-white rounded-tr-sm"
                  : "bg-white/5 border border-white/5 text-white/80 rounded-tl-sm"
              }`}
            >
              {msg.content || (loading && i === messages.length - 1 ? (
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              ) : "")}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts */}
      <div className="flex gap-2 overflow-x-auto pb-3 pt-1 shrink-0">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p.label}
            onClick={() => sendMessage(p.text)}
            disabled={loading}
            className="shrink-0 bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-xs px-4 py-2 rounded-xl transition-all disabled:opacity-40"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
        className="flex gap-2 shrink-0"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta..."
          disabled={loading}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  );
}
