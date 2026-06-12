import { getGeminiClient } from "./client";

interface StructuredOptions {
  model: string;
  systemInstruction?: string;
  prompt: string | Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
  jsonSchema: unknown;
  maxOutputTokens?: number;
}

/**
 * Llamada a Gemini que devuelve JSON validado contra un JSON Schema.
 * Reemplaza el patrón de output_config.format de Claude.
 */
export async function generateStructured<T>(opts: StructuredOptions): Promise<T> {
  const client = getGeminiClient();

  // Construir el contenido: texto simple o multimodal (PDF + texto)
  const contents = Array.isArray(opts.prompt)
    ? [{ role: "user" as const, parts: opts.prompt }]
    : opts.prompt;

  const response = await client.models.generateContent({
    model: opts.model,
    contents,
    config: {
      systemInstruction: opts.systemInstruction,
      responseMimeType: "application/json",
      responseJsonSchema: opts.jsonSchema,
      maxOutputTokens: opts.maxOutputTokens ?? 8192,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini no devolvió contenido");
  }

  return JSON.parse(text) as T;
}

interface TextOptions {
  model: string;
  systemInstruction?: string;
  prompt: string;
  maxOutputTokens?: number;
}

/**
 * Llamada a Gemini que devuelve texto plano (cartas, mensajes, planes).
 */
export async function generateText(opts: TextOptions): Promise<string> {
  const client = getGeminiClient();

  const response = await client.models.generateContent({
    model: opts.model,
    contents: opts.prompt,
    config: {
      systemInstruction: opts.systemInstruction,
      maxOutputTokens: opts.maxOutputTokens ?? 4096,
    },
  });

  return response.text ?? "";
}
