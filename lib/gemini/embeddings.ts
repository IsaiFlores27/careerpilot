import { getGeminiClient } from "./client";

// Modelo de embeddings de Gemini. 1536 dims para coincidir con el schema pgvector.
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMS = 1536;

/**
 * Genera un embedding de 1536 dimensiones para matching semántico (pgvector).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getGeminiClient();

  const response = await client.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text.substring(0, 8000),
    config: {
      outputDimensionality: EMBEDDING_DIMS,
    },
  });

  const values = response.embeddings?.[0]?.values;
  if (!values || values.length === 0) {
    throw new Error("Gemini no devolvió embedding");
  }

  return values;
}
