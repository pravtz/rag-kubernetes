import { QdrantClient } from '@qdrant/js-client-rest';
import { config } from '../config/config';
import {
  getVectorSize as getVectorSizeInternal,
  isQdrantReachable as isQdrantReachableInternal,
  getQdrantDiagnostics as getQdrantDiagnosticsInternal,
  ensureCollection as ensureCollectionInternal,
} from '../modules/rag/infrastructure/persistence/qdrant/QdrantDiagnostics';

// Legacy singleton client — new code should use QdrantClientFactory
export const qdrantClient = new QdrantClient({
  url: config.qdrant.url,
  ...(config.qdrant.apiKey ? { apiKey: config.qdrant.apiKey } : {}),
});

// Re-export functions with legacy signatures for backward compatibility
export function getVectorSize(): number {
  return getVectorSizeInternal(config.openai.embeddingModel);
}

export async function isQdrantReachable(): Promise<boolean> {
  return isQdrantReachableInternal(qdrantClient);
}

export async function getQdrantDiagnostics() {
  return getQdrantDiagnosticsInternal(
    qdrantClient,
    config.qdrant.collectionName,
    config.qdrant.url,
    config.openai.embeddingModel,
  );
}

export async function ensureCollection(collectionName: string): Promise<void> {
  return ensureCollectionInternal(qdrantClient, collectionName, config.openai.embeddingModel);
}
