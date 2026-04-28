import { UseCase } from '../../../../shared/application/UseCase';
import { Result } from '../../../../shared/application/Result';
import { AppError } from '../../../../shared/errors/AppError';
import { IVectorRepository } from '../../domain/repositories/IVectorRepository';
import { ILlmService, LlmMetrics } from '../ports/ILlmService';

interface QueryDocumentsInput {
  question: string;
  topK: number;
  onToken: (token: string) => void;
}

export class QueryDocumentsUseCase
  implements UseCase<QueryDocumentsInput, Result<LlmMetrics, AppError>>
{
  constructor(
    private readonly vectorRepository: IVectorRepository,
    private readonly llmService: ILlmService,
  ) {}

  async execute(
    input: QueryDocumentsInput,
  ): Promise<Result<LlmMetrics, AppError>> {
    const chunks = await this.vectorRepository.similaritySearch(
      input.question,
      input.topK,
    );

    const context = chunks.map((c) => c.content).join('\n\n---\n\n');

    const metrics = await this.llmService.streamResponse(
      input.question,
      context,
      input.onToken,
    );

    return Result.ok(metrics);
  }
}
