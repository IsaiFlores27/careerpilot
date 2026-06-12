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
// - fast: búsqueda de vacantes con grounding (necesita capacidad + Google Search)
// - cheap: tareas mecánicas (scoring nocturno, follow-ups, clasificación)
export const GEMINI_MODELS = {
  quality: "gemini-3.5-flash",
  fast: "gemini-3.5-flash",
  cheap: "gemini-2.5-flash-lite",
} as const;
