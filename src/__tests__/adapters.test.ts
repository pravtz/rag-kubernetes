import { RRFRerankerAdapter } from '../modules/rag/infrastructure/adapters/RRFRerankerAdapter';
import { QdrantVectorRepositoryRegistry } from '../modules/rag/infrastructure/persistence/qdrant/QdrantVectorRepositoryRegistry';
import { Chunk } from '../modules/rag/domain/value-objects/Chunk';
import { ChunkMetadata } from '../modules/rag/domain/value-objects/ChunkMetadata';
import { IVectorRepository } from '../modules/rag/domain/repositories/IVectorRepository';

function makeChunk(content: string): Chunk {
  return Chunk.create({
    content,
    metadata: ChunkMetadata.create({
      chunkId: `id-${content}`,
      chunkIndex: 0,
      source: 'test.pdf',
      page: 1,
    }),
  });
}

describe('RRFRerankerAdapter', () => {
  it('should assign RRF scores based on rank', async () => {
    const reranker = new RRFRerankerAdapter(60);
    const chunkA = makeChunk('A');
    const chunkB = makeChunk('B');

    const result = await reranker.rerank({
      question: 'test',
      chunks: [
        { chunk: chunkA, collectionName: 'docs' },
        { chunk: chunkB, collectionName: 'docs' },
      ],
    });

    expect(result).toHaveLength(2);
    // Rank 1 → score = 1/(60+1), Rank 2 → score = 1/(60+2)
    expect(result[0].score).toBeCloseTo(1 / 61);
    expect(result[1].score).toBeCloseTo(1 / 62);
  });

  it('should merge and sort results from multiple collections', async () => {
    const reranker = new RRFRerankerAdapter(60);
    const chunkA = makeChunk('A');
    const chunkB = makeChunk('B');
    const chunkC = makeChunk('C');

    const result = await reranker.rerank({
      question: 'test',
      chunks: [
        { chunk: chunkA, collectionName: 'docs' },     // docs rank 1
        { chunk: chunkB, collectionName: 'normas' },   // normas rank 1
        { chunk: chunkC, collectionName: 'docs' },     // docs rank 2
      ],
    });

    expect(result).toHaveLength(3);
    // docs rank 1 and normas rank 1 have same score 1/61
    // docs rank 2 has score 1/62
    const scores = result.map((r) => r.score);
    expect(scores[0]).toBeCloseTo(1 / 61);
    expect(scores[1]).toBeCloseTo(1 / 61);
    expect(scores[2]).toBeCloseTo(1 / 62);
  });

  it('should return empty array for empty input', async () => {
    const reranker = new RRFRerankerAdapter();
    const result = await reranker.rerank({
      question: 'test',
      chunks: [],
    });
    expect(result).toHaveLength(0);
  });
});

describe('QdrantVectorRepositoryRegistry', () => {
  function createMockRepo(): jest.Mocked<IVectorRepository> {
    return {
      addDocuments: jest.fn(),
      similaritySearch: jest.fn().mockResolvedValue([]),
      isReachable: jest.fn().mockResolvedValue(true),
      ensureCollection: jest.fn(),
      getDiagnostics: jest.fn().mockResolvedValue({
        storeUrl: 'http://localhost:6333',
        collectionName: 'test',
        reachable: true,
        collectionExists: true,
        totalCollections: 1,
        pointsCount: 10,
        expectedVectorSize: 1536,
        collectionStatus: 'green',
      }),
    };
  }

  it('should return repository for a known collection', () => {
    const repo = createMockRepo();
    const map = new Map([['docs', repo]]);
    const registry = new QdrantVectorRepositoryRegistry(map);

    expect(registry.get('docs')).toBe(repo);
  });

  it('should throw UnknownCollectionError for unknown collection', () => {
    const map = new Map<string, IVectorRepository>();
    const registry = new QdrantVectorRepositoryRegistry(map);

    expect(() => registry.get('unknown')).toThrow('Unknown collection: unknown');
  });

  it('should return all collection names', () => {
    const map = new Map<string, IVectorRepository>([
      ['docs', createMockRepo()],
      ['normas', createMockRepo()],
    ]);
    const registry = new QdrantVectorRepositoryRegistry(map);

    expect(registry.getCollectionNames()).toEqual(['docs', 'normas']);
  });

  it('should call ensureCollection on all repositories', async () => {
    const repoA = createMockRepo();
    const repoB = createMockRepo();
    const map = new Map<string, IVectorRepository>([
      ['a', repoA],
      ['b', repoB],
    ]);
    const registry = new QdrantVectorRepositoryRegistry(map);

    await registry.ensureAllCollections();
    expect(repoA.ensureCollection).toHaveBeenCalled();
    expect(repoB.ensureCollection).toHaveBeenCalled();
  });

  it('should check reachability via first repo', async () => {
    const repo = createMockRepo();
    const map = new Map([['docs', repo]]);
    const registry = new QdrantVectorRepositoryRegistry(map);

    const reachable = await registry.isReachable();
    expect(reachable).toBe(true);
    expect(repo.isReachable).toHaveBeenCalled();
  });

  it('should return false if no repositories', async () => {
    const map = new Map<string, IVectorRepository>();
    const registry = new QdrantVectorRepositoryRegistry(map);

    const reachable = await registry.isReachable();
    expect(reachable).toBe(false);
  });

  it('should get diagnostics from all repositories', async () => {
    const repoA = createMockRepo();
    const repoB = createMockRepo();
    const map = new Map<string, IVectorRepository>([
      ['a', repoA],
      ['b', repoB],
    ]);
    const registry = new QdrantVectorRepositoryRegistry(map);

    const diagnostics = await registry.getDiagnosticsAll();
    expect(diagnostics).toHaveLength(2);
    expect(repoA.getDiagnostics).toHaveBeenCalled();
    expect(repoB.getDiagnostics).toHaveBeenCalled();
  });
});
