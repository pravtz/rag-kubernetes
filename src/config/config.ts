import 'dotenv/config';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export interface CollectionConfig {
  name: string;
  description: string;
}

function parseCollections(): CollectionConfig[] {
  const collectionsRaw = process.env.QDRANT_COLLECTIONS;
  const descriptionsRaw = process.env.QDRANT_COLLECTION_DESCRIPTIONS;

  if (collectionsRaw) {
    const names = collectionsRaw.split(',').map((s) => s.trim()).filter(Boolean);
    const descriptions = descriptionsRaw
      ? descriptionsRaw.split(',').map((s) => s.trim())
      : names.map(() => '');
    return names.map((name, i) => ({
      name,
      description: descriptions[i] ?? '',
    }));
  }

  // Backward compat: single collection from QDRANT_COLLECTION_NAME
  const singleName = process.env.QDRANT_COLLECTION_NAME;
  if (singleName) {
    return [{ name: singleName, description: '' }];
  }

  throw new Error(
    'Missing required environment variable: QDRANT_COLLECTIONS or QDRANT_COLLECTION_NAME',
  );
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
    collectionName: process.env.QDRANT_COLLECTION_NAME ?? process.env.QDRANT_COLLECTIONS?.split(',')[0]?.trim() ?? 'rag_collection',
    collections: parseCollections(),
  },
  chunking: {
    chunkSize: parseInt(process.env.CHUNK_SIZE ?? '1000', 10),
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP ?? '200', 10),
    topK: parseInt(process.env.TOP_K ?? '4', 10),
  },
};
