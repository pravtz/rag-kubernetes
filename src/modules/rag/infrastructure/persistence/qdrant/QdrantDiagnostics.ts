import { QdrantClient } from '@qdrant/js-client-rest';
import { VectorStoreDiagnostics } from '../../../domain/repositories/IVectorRepository';

// Vector size per OpenAI embedding model
const VECTOR_SIZE_MAP: Record<string, number> = {
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,
};

export function getVectorSize(embeddingModel: string): number {
  return VECTOR_SIZE_MAP[embeddingModel] ?? 1536;
}

export async function isQdrantReachable(client: QdrantClient): Promise<boolean> {
  try {
    await client.getCollections();
    return true;
  } catch {
    return false;
  }
}

export async function getQdrantDiagnostics(
  client: QdrantClient,
  collectionName: string,
  qdrantUrl: string,
  embeddingModel: string,
): Promise<VectorStoreDiagnostics> {
  const { collections } = await client.getCollections();
  const collectionExists = collections.some((c) => c.name === collectionName);

  let pointsCount: number | null = null;
  let collectionStatus: string | null = null;

  if (collectionExists) {
    const collectionInfo = await client.getCollection(collectionName);
    const countResult = await client.count(collectionName, { exact: true });

    pointsCount = countResult.count;
    collectionStatus = collectionInfo.status ?? null;
  }

  return {
    storeUrl: qdrantUrl,
    collectionName,
    reachable: true,
    collectionExists,
    totalCollections: collections.length,
    pointsCount,
    expectedVectorSize: getVectorSize(embeddingModel),
    collectionStatus,
  };
}

export async function ensureCollection(
  client: QdrantClient,
  collectionName: string,
  embeddingModel: string,
): Promise<void> {
  const { collections } = await client.getCollections();
  const exists = collections.some((c) => c.name === collectionName);

  if (!exists) {
    await client.createCollection(collectionName, {
      vectors: {
        size: getVectorSize(embeddingModel),
        distance: 'Cosine',
      },
    });
    console.log(`Collection "${collectionName}" created.`);
  }
}
