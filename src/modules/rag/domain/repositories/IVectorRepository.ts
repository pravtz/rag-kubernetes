import { Chunk } from '../value-objects/Chunk';

export interface VectorStoreDiagnostics {
  storeUrl: string;
  collectionName: string;
  reachable: boolean;
  collectionExists: boolean;
  totalCollections: number;
  pointsCount: number | null;
  expectedVectorSize: number;
  collectionStatus: string | null;
}

export interface IVectorRepository {
  addDocuments(chunks: Chunk[]): Promise<void>;
  similaritySearch(query: string, topK: number): Promise<Chunk[]>;
  isReachable(): Promise<boolean>;
  ensureCollection(): Promise<void>;
  getDiagnostics(): Promise<VectorStoreDiagnostics>;
}
