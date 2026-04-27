import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from '@langchain/core/documents';
import { IChunkingService } from '../../domain/services/IChunkingService';
import { RawDocument } from '../../domain/types';

interface ChunkingConfig {
  chunkSize: number;
  chunkOverlap: number;
}

export class LangChainChunkingAdapter implements IChunkingService {
  private readonly splitter: RecursiveCharacterTextSplitter;

  constructor(chunkingConfig: ChunkingConfig) {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: chunkingConfig.chunkSize,
      chunkOverlap: chunkingConfig.chunkOverlap,
    });
  }

  async split(documents: RawDocument[]): Promise<RawDocument[]> {
    const langchainDocs = documents.map(
      (doc) =>
        new Document({
          pageContent: doc.pageContent,
          metadata: doc.metadata,
        }),
    );

    const chunks = await this.splitter.splitDocuments(langchainDocs);

    return chunks.map((chunk) => ({
      pageContent: chunk.pageContent,
      metadata: chunk.metadata as Record<string, unknown>,
    }));
  }
}
