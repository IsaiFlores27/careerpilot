import { GoogleGenAI } from "@google/genai";

// Singleton del cliente de Gemini
let _client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!_client) {
    _client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }
  return _client;
}

// Modelos:
// - quality: redacción/análisis de cara al usuario (CV, cartas, coach, LinkedIn)
// - fast: búsqueda de vacantes con grounding (Google Search) — requiere 2.0-flash o superior
// - cheap: tareas mecánicas (scoring nocturno, follow-ups, clasificación)
export const GEMINI_MODELS = {
  quality: "gemini-2.0-flash",
  fast:    "gemini-2.0-flash",
  cheap:   "gemini-2.0-flash-lite",
} as const;
