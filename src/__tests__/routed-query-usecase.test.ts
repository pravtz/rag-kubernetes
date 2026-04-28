import { RoutedQueryUseCase } from '../modules/rag/application/use-cases/RoutedQueryUseCase';
import { IVectorRepositoryRegistry } from '../modules/rag/domain/repositories/IVectorRepositoryRegistry';
import { IQueryRouter } from '../modules/rag/application/ports/IQueryRouter';
import { IReranker } from '../modules/rag/application/ports/IReranker';
import { ILlmService, LlmMetrics } from '../modules/rag/application/ports/ILlmService';
import { QueryIntent } from '../modules/rag/domain/value-objects/QueryIntent';
import { ScoredChunk } from '../modules/rag/domain/value-objects/ScoredChunk';
import { Chunk } from '../modules/rag/domain/value-objects/Chunk';
import { ChunkMetadata } from '../modules/rag/domain/value-objects/ChunkMetadata';

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

function createMocks() {
  const mockRepo = {
    addDocuments: jest.fn(),
    similaritySearch: jest.fn().mockResolvedValue([makeChunk('result text')]),
    isReachable: jest.fn().mockResolvedValue(true),
    ensureCollection: jest.fn(),
    getDiagnostics: jest.fn(),
  };

  const registry: jest.Mocked<IVectorRepositoryRegistry> = {
    get: jest.fn().mockReturnValue(mockRepo),
    getCollectionNames: jest.fn().mockReturnValue(['docs', 'normas']),
    ensureAllCollections: jest.fn(),
    isReachable: jest.fn().mockResolvedValue(true),
    getDiagnosticsAll: jest.fn(),
  };

  const queryRouter: jest.Mocked<IQueryRouter> = {
    classify: jest.fn().mockResolvedValue(
      QueryIntent.create([{ collectionName: 'docs', confidence: 0.9 }]),
    ),
  };

  const reranker: jest.Mocked<IReranker> = {
    rerank: jest.fn().mockResolvedValue([
      ScoredChunk.create({
        chunk: makeChunk('result text'),
        score: 0.95,
        collectionName: 'docs',
      }),
    ]),
  };

  const fakeLlmMetrics: LlmMetrics = {
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
    durationMs: 1200,
    tokensPerSecond: 41.67,
    model: 'gpt-4o-mini',
  };

  const llmService: jest.Mocked<ILlmService> = {
    streamResponse: jest.fn().mockResolvedValue(fakeLlmMetrics),
  };

  return { registry, queryRouter, reranker, llmService, mockRepo };
}

describe('RoutedQueryUseCase', () => {
  it('should route to a single collection and return ok', async () => {
    const { registry, queryRouter, reranker, llmService } = createMocks();
    const useCase = new RoutedQueryUseCase(
      registry,
      queryRouter,
      reranker,
      llmService,
    );

    const onToken = jest.fn();
    const result = await useCase.execute({
      dto: { question: 'What is DDD?' },
      collections: [{ name: 'docs', description: 'Docs' }],
      topK: 4,
      onToken,
    });

    expect(result.isOk).toBe(true);
    expect(queryRouter.classify).toHaveBeenCalledWith('What is DDD?', [
      { name: 'docs', description: 'Docs' },
    ]);
    expect(registry.get).toHaveBeenCalledWith('docs');
    expect(reranker.rerank).toHaveBeenCalled();
    expect(llmService.streamResponse).toHaveBeenCalled();
  });

  it('should route to multiple collections in parallel', async () => {
    const { registry, queryRouter, reranker, llmService, mockRepo } =
      createMocks();

    queryRouter.classify.mockResolvedValue(
      QueryIntent.create([
        { collectionName: 'docs', confidence: 0.8 },
        { collectionName: 'normas', confidence: 0.7 },
      ]),
    );

    const useCase = new RoutedQueryUseCase(
      registry,
      queryRouter,
      reranker,
      llmService,
    );

    const result = await useCase.execute({
      dto: { question: 'some question' },
      collections: [
        { name: 'docs', description: 'Docs' },
        { name: 'normas', description: 'Normas' },
      ],
      topK: 4,
      onToken: jest.fn(),
    });

    expect(result.isOk).toBe(true);
    expect(registry.get).toHaveBeenCalledWith('docs');
    expect(registry.get).toHaveBeenCalledWith('normas');
    expect(mockRepo.similaritySearch).toHaveBeenCalledTimes(2);
  });

  it('should bypass router when forceCollections is provided', async () => {
    const { registry, queryRouter, reranker, llmService } = createMocks();
    const useCase = new RoutedQueryUseCase(
      registry,
      queryRouter,
      reranker,
      llmService,
    );

    const result = await useCase.execute({
      dto: { question: 'test', forceCollections: ['normas'] },
      collections: [
        { name: 'docs', description: 'Docs' },
        { name: 'normas', description: 'Normas' },
      ],
      topK: 4,
      onToken: jest.fn(),
    });

    expect(result.isOk).toBe(true);
    expect(queryRouter.classify).not.toHaveBeenCalled();
    expect(registry.get).toHaveBeenCalledWith('normas');
  });

  it('should handle empty search results gracefully', async () => {
    const { registry, queryRouter, reranker, llmService, mockRepo } =
      createMocks();
    mockRepo.similaritySearch.mockResolvedValue([]);

    const useCase = new RoutedQueryUseCase(
      registry,
      queryRouter,
      reranker,
      llmService,
    );

    const result = await useCase.execute({
      dto: { question: 'obscure question' },
      collections: [{ name: 'docs', description: 'Docs' }],
      topK: 4,
      onToken: jest.fn(),
    });

    expect(result.isOk).toBe(true);
    expect(reranker.rerank).not.toHaveBeenCalled();
    expect(llmService.streamResponse).toHaveBeenCalledWith(
      'obscure question',
      '',
      expect.any(Function),
    );
  });
});
