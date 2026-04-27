import { IVectorRepositoryRegistry } from '../../../domain/repositories/IVectorRepositoryRegistry';
import {
  IVectorRepository,
  VectorStoreDiagnostics,
} from '../../../domain/repositories/IVectorRepository';
import { UnknownCollectionError } from '../../../domain/errors/DomainErrors';

export class QdrantVectorRepositoryRegistry
  implements IVectorRepositoryRegistry
{
  private readonly repositories: Map<string, IVectorRepository>;

  constructor(repositories: Map<string, IVectorRepository>) {
    this.repositories = repositories;
  }

  get(collectionName: string): IVectorRepository {
    const repo = this.repositories.get(collectionName);
    if (!repo) {
      throw new UnknownCollectionError(collectionName);
    }
    return repo;
  }

  getCollectionNames(): string[] {
    return Array.from(this.repositories.keys());
  }

  async ensureAllCollections(): Promise<void> {
    await Promise.all(
      Array.from(this.repositories.values()).map((repo) =>
        repo.ensureCollection(),
      ),
    );
  }

  async isReachable(): Promise<boolean> {
    const repos = Array.from(this.repositories.values());
    if (repos.length === 0) return false;
    // Check the first repository — they all share the same Qdrant client
    return repos[0].isReachable();
  }

  async getDiagnosticsAll(): Promise<VectorStoreDiagnostics[]> {
    return Promise.all(
      Array.from(this.repositories.values()).map((repo) =>
        repo.getDiagnostics(),
      ),
    );
  }
}
