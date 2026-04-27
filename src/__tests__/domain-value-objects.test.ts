import { QueryIntent } from '../modules/rag/domain/value-objects/QueryIntent';
import { ScoredChunk } from '../modules/rag/domain/value-objects/ScoredChunk';
import { ChunkMetadata } from '../modules/rag/domain/value-objects/ChunkMetadata';
import { Chunk } from '../modules/rag/domain/value-objects/Chunk';

describe('QueryIntent', () => {
  it('should create with valid targets', () => {
    const intent = QueryIntent.create([
      { collectionName: 'docs', confidence: 0.9 },
    ]);
    expect(intent.targets).toHaveLength(1);
    expect(intent.targets[0].collectionName).toBe('docs');
    expect(intent.targets[0].confidence).toBe(0.9);
  });

  it('should create with multiple targets', () => {
    const intent = QueryIntent.create([
      { collectionName: 'docs', confidence: 0.9 },
      { collectionName: 'normas', confidence: 0.6 },
    ]);
    expect(intent.targets).toHaveLength(2);
  });

  it('should throw when created with empty targets', () => {
    expect(() => QueryIntent.create([])).toThrow(
      'QueryIntent must have at least one target',
    );
  });

  it('should throw when created with null targets', () => {
    expect(() => QueryIntent.create(null as any)).toThrow();
  });

  it('equals should return true for same targets', () => {
    const a = QueryIntent.create([
      { collectionName: 'docs', confidence: 0.9 },
    ]);
    const b = QueryIntent.create([
      { collectionName: 'docs', confidence: 0.9 },
    ]);
    expect(a.equals(b)).toBe(true);
  });

  it('equals should return false for different targets', () => {
    const a = QueryIntent.create([
      { collectionName: 'docs', confidence: 0.9 },
    ]);
    const b = QueryIntent.create([
      { collectionName: 'normas', confidence: 0.5 },
    ]);
    expect(a.equals(b)).toBe(false);
  });
});

describe('ScoredChunk', () => {
  const makeChunk = (content: string) =>
    Chunk.create({
      content,
      metadata: ChunkMetadata.create({
        chunkId: 'id-1',
        chunkIndex: 0,
        source: 'test.pdf',
        page: 1,
      }),
    });

  it('should create with valid props', () => {
    const chunk = makeChunk('some text');
    const scored = ScoredChunk.create({
      chunk,
      score: 0.95,
      collectionName: 'docs',
    });
    expect(scored.score).toBe(0.95);
    expect(scored.collectionName).toBe('docs');
    expect(scored.chunk.content).toBe('some text');
  });

  it('equals should return true for same values', () => {
    const chunk = makeChunk('text');
    const a = ScoredChunk.create({
      chunk,
      score: 0.9,
      collectionName: 'docs',
    });
    const b = ScoredChunk.create({
      chunk,
      score: 0.9,
      collectionName: 'docs',
    });
    expect(a.equals(b)).toBe(true);
  });

  it('equals should return false for different scores', () => {
    const chunk = makeChunk('text');
    const a = ScoredChunk.create({
      chunk,
      score: 0.9,
      collectionName: 'docs',
    });
    const b = ScoredChunk.create({
      chunk,
      score: 0.5,
      collectionName: 'docs',
    });
    expect(a.equals(b)).toBe(false);
  });
});

describe('ChunkMetadata with collectionName', () => {
  it('should create with collectionName', () => {
    const meta = ChunkMetadata.create({
      chunkId: 'id-1',
      chunkIndex: 0,
      source: 'file.pdf',
      page: 1,
      collectionName: 'docs',
    });
    expect(meta.collectionName).toBe('docs');
  });

  it('should create without collectionName', () => {
    const meta = ChunkMetadata.create({
      chunkId: 'id-1',
      chunkIndex: 0,
      source: 'file.pdf',
      page: 1,
    });
    expect(meta.collectionName).toBeUndefined();
  });

  it('equals should compare collectionName', () => {
    const a = ChunkMetadata.create({
      chunkId: 'id-1',
      chunkIndex: 0,
      source: 'file.pdf',
      page: 1,
      collectionName: 'docs',
    });
    const b = ChunkMetadata.create({
      chunkId: 'id-1',
      chunkIndex: 0,
      source: 'file.pdf',
      page: 1,
      collectionName: 'normas',
    });
    expect(a.equals(b)).toBe(false);
  });
});
