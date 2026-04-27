import { ScoredChunk } from '../../domain/value-objects/ScoredChunk';
import { Chunk } from '../../domain/value-objects/Chunk';

export interface RerankerInput {
  question: string;
  chunks: Array<{ chunk: Chunk; collectionName: string }>;
}

export interface IReranker {
  rerank(input: RerankerInput): Promise<ScoredChunk[]>;
}
