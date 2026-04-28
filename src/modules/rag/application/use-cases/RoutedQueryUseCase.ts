import { UseCase } from '../../../../shared/application/UseCase';
import { Result } from '../../../../shared/application/Result';
import { AppError } from '../../../../shared/errors/AppError';
import { Question } from '../../domain/value-objects/Question';
import { ScoredChunk } from '../../domain/value-objects/ScoredChunk';
import { IVectorRepositoryRegistry } from '../../domain/repositories/IVectorRepositoryRegistry';
import { IQueryRouter, CollectionInfo } from '../ports/IQueryRouter';
import { IReranker } from '../ports/IReranker';
import { ILlmService, LlmMetrics } from '../ports/ILlmService';
import { RoutedQueryRequestDTO } from '../dtos/RoutedQueryRequestDTO';
import { CollectionTarget } from '../../domain/value-objects/QueryIntent';

interface RoutedQueryInput {
  dto: RoutedQueryRequestDTO;
  collections: CollectionInfo[];
  topK: number;
  onToken: (token: string) => void;
}

export class RoutedQueryUseCase
  implements UseCase<RoutedQueryInput, Result<LlmMetrics, AppError>>
{
  constructor(
    private readonly registry: IVectorRepositoryRegistry,
    private readonly queryRouter: IQueryRouter,
    private readonly reranker: IReranker,
    private readonly llmService: ILlmService,
  ) {}

  async execute(input: RoutedQueryInput): Promise<Result<LlmMetrics, AppError>> {
    const question = Question.create(input.dto.question);

    let targets: CollectionTarget[];

    if (input.dto.forceCollections && input.dto.forceCollections.length > 0) {
      targets = input.dto.forceCollections.map((name) => ({
        collectionName: name,
        confidence: 1,
      }));
    } else {
      const intent = await this.queryRouter.classify(
        question.value,
        input.collections,
      );
      targets = [...intent.targets];
    }

    const topK = input.dto.topK ?? input.topK;

    // Parallel search across targeted collections
    const searchResults = await Promise.all(
      targets.map(async (target) => {
        const repo = this.registry.get(target.collectionName);
        const chunks = await repo.similaritySearch(question.value, topK);
        return chunks.map((chunk) => ({
          chunk,
          collectionName: target.collectionName,
        }));
      }),
    );

    const allChunks = searchResults.flat();

    if (allChunks.length === 0) {
      const metrics = await this.llmService.streamResponse(
        question.value,
        '',
        input.onToken,
      );
      return Result.ok(metrics);
    }

    // Rerank results from multiple collections
    const ranked: ScoredChunk[] = await this.reranker.rerank({
      question: question.value,
      chunks: allChunks,
    });

    const context = ranked
      .map((sc) => sc.chunk.content)
      .join('\n\n---\n\n');

    const metrics = await this.llmService.streamResponse(
      question.value,
      context,
      input.onToken,
    );

    return Result.ok(metrics);
  }
}
