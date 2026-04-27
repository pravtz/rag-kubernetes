import { QdrantClient } from '@qdrant/js-client-rest';
import { QdrantVectorStore } from '@langchain/qdrant';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import {
  IVectorRepository,
  VectorStoreDiagnostics,
} from '../../../domain/repositories/IVectorRepository';
import { Chunk } from '../../../domain/value-objects/Chunk';
import { ChunkMetadata } from '../../../domain/value-objects/ChunkMetadata';
import {
  ensureCollection,
  getQdrantDiagnostics,
  isQdrantReachable,
} from './QdrantDiagnostics';

interface QdrantVectorRepositoryConfig {
  collectionName: string;
  qdrantUrl: string;
  embeddingModel: string;
}

export class QdrantVectorRepository implements IVectorRepository {
  constructor(
    private readonly client: QdrantClient,
    private readonly embeddings: OpenAIEmbeddings,
    private readonly repositoryConfig: QdrantVectorRepositoryConfig,
  ) {}

  async addDocuments(chunks: Chunk[]): Promise<void> {
    const docs = chunks.map(
      (chunk) =>
        new Document({
          pageContent: chunk.content,
          metadata: {
            chunkId: chunk.metadata.chunkId,
            chunkIndex: chunk.metadata.chunkIndex,
            source: chunk.metadata.source,
            page: chunk.metadata.page,
          },
        }),
    );

    const vectorStore = new QdrantVectorStore(this.embeddings, {
      client: this.client,
      collectionName: this.repositoryConfig.collectionName,
    });

    await vectorStore.addDocuments(docs);
  }

  async similaritySearch(query: string, topK: number): Promise<Chunk[]> {
    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      this.embeddings,
      {
        client: this.client,
        collectionName: this.repositoryConfig.collectionName,
      },
    );

    const results = await vectorStore.similaritySearch(query, topK);

    return results.map((doc) =>
      Chunk.create({
        content: doc.pageContent,
        metadata: ChunkMetadata.create({
          chunkId: (doc.metadata.chunkId as string) ?? '',
          chunkIndex: (doc.metadata.chunkIndex as number) ?? 0,
          source: (doc.metadata.source as string) ?? '',
          page: (doc.metadata.page as number) ?? 0,
        }),
      }),
    );
  }

  async isReachable(): Promise<boolean> {
    return isQdrantReachable(this.client);
  }

  async ensureCollection(): Promise<void> {
    return ensureCollection(
      this.client,
      this.repositoryConfig.collectionName,
      this.repositoryConfig.embeddingModel,
    );
  }

  async getDiagnostics(): Promise<VectorStoreDiagnostics> {
    return getQdrantDiagnostics(
      this.client,
      this.repositoryConfig.collectionName,
      this.repositoryConfig.qdrantUrl,
      this.repositoryConfig.embeddingModel,
    );
  }
}
