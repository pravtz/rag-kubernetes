import { IReranker, RerankerInput } from '../../application/ports/IReranker';
import { ScoredChunk } from '../../domain/value-objects/ScoredChunk';

const DEFAULT_K = 60;

export class RRFRerankerAdapter implements IReranker {
  private readonly k: number;

  constructor(k = DEFAULT_K) {
    this.k = k;
  }

  async rerank(input: RerankerInput): Promise<ScoredChunk[]> {
    // Each collection's results are already ranked by similarity.
    // Group chunks by collection to preserve per-collection ranking.
    const byCollection = new Map<
      string,
      Array<{ chunk: RerankerInput['chunks'][number]; rank: number }>
    >();

    for (const item of input.chunks) {
      const list = byCollection.get(item.collectionName) ?? [];
      list.push({ chunk: item, rank: list.length + 1 });
      byCollection.set(item.collectionName, list);
    }

    // Compute RRF score: score = Σ 1/(k + rank)
    // Each chunk appears in exactly one collection, so its RRF score is simply 1/(k + rank)
    const scored: ScoredChunk[] = [];

    for (const [, items] of byCollection) {
      for (const { chunk, rank } of items) {
        scored.push(
          ScoredChunk.create({
            chunk: chunk.chunk,
            score: 1 / (this.k + rank),
            collectionName: chunk.collectionName,
          }),
        );
      }
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored;
  }
}
