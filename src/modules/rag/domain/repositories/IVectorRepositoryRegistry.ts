import { IVectorRepository, VectorStoreDiagnostics } from './IVectorRepository';

export interface IVectorRepositoryRegistry {
  get(collectionName: string): IVectorRepository;
  getCollectionNames(): string[];
  ensureAllCollections(): Promise<void>;
  isReachable(): Promise<boolean>;
  getDiagnosticsAll(): Promise<VectorStoreDiagnostics[]>;
}
