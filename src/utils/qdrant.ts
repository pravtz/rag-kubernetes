import { QdrantClient } from '@qdrant/js-client-rest';
import { config } from '../config/config';

// Singleton Qdrant client shared across the application
export const qdrantClient = new QdrantClient({
  url: config.qdrant.url,
  ...(config.qdrant.apiKey ? { apiKey: config.qdrant.apiKey } : {}),
});

// Vector size per OpenAI embedding model
const VECTOR_SIZE_MAP: Record<string, number> = {
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,
};

export function getVectorSize(): number {
  return VECTOR_SIZE_MAP[config.openai.embeddingModel] ?? 1536;
}

export async function isQdrantReachable(): Promise<boolean> {
  try {
    await qdrantClient.getCollections();
    return true;
  } catch {
    return false;
  }
}

export async function getQdrantDiagnostics(): Promise<{
  qdrantUrl: string;
  collectionName: string;
  reachable: boolean;
  collectionExists: boolean;
  totalCollections: number;
  pointsCount: number | null;
  expectedVectorSize: number;
  collectionStatus: string | null;
}> {
  const { collections } = await qdrantClient.getCollections();
  const collectionName = config.qdrant.collectionName;
  const collectionExists = collections.some((collection) => collection.name === collectionName);

  let pointsCount: number | null = null;
  let collectionStatus: string | null = null;

  if (collectionExists) {
    const collectionInfo = await qdrantClient.getCollection(collectionName);
    const countResult = await qdrantClient.count(collectionName, { exact: true });

    pointsCount = countResult.count;
    collectionStatus = collectionInfo.status ?? null;
  }

  return {
    qdrantUrl: config.qdrant.url,
    collectionName,
    reachable: true,
    collectionExists,
    totalCollections: collections.length,
    pointsCount,
    expectedVectorSize: getVectorSize(),
    collectionStatus,
  };
}

/**
 * Creates the Qdrant collection if it does not already exist.
 * Must be called before any write operation to avoid runtime errors.
 */
export async function ensureCollection(collectionName: string): Promise<void> {
  const { collections } = await qdrantClient.getCollections();
  const exists = collections.some((c) => c.name === collectionName);

  if (!exists) {
    await qdrantClient.createCollection(collectionName, {
      vectors: {
        size: getVectorSize(),
        distance: 'Cosine',
      },
    });
    console.log(`Collection "${collectionName}" created.`);
  }
}
