import { QdrantClient } from '@qdrant/js-client-rest';

interface QdrantConfig {
  url: string;
  apiKey?: string;
}

export class QdrantClientFactory {
  private static instance: QdrantClient | null = null;

  static create(qdrantConfig: QdrantConfig): QdrantClient {
    if (!QdrantClientFactory.instance) {
      QdrantClientFactory.instance = new QdrantClient({
        url: qdrantConfig.url,
        ...(qdrantConfig.apiKey ? { apiKey: qdrantConfig.apiKey } : {}),
      });
    }
    return QdrantClientFactory.instance;
  }
}
