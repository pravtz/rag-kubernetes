import 'dotenv/config';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  openai: {
    apiKey: requireEnv('OPENAI_API_KEY'),
    chatModel: process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini',
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
  },
  qdrant: {
    url: requireEnv('QDRANT_URL'),
    apiKey: process.env.QDRANT_API_KEY,
    collectionName: requireEnv('QDRANT_COLLECTION_NAME'),
  },
  chunking: {
    chunkSize: parseInt(process.env.CHUNK_SIZE ?? '1000', 10),
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP ?? '200', 10),
    topK: parseInt(process.env.TOP_K ?? '4', 10),
  },
};
