import { UseCase } from '../../../../shared/application/UseCase';
import { Result } from '../../../../shared/application/Result';
import { AppError } from '../../../../shared/errors/AppError';
import { ApiStatusDTO } from '../dtos/ApiStatusDTO';
import { IVectorRepositoryRegistry } from '../../domain/repositories/IVectorRepositoryRegistry';

interface GetApiStatusInput {
  env: string;
}

export class GetApiStatusUseCase
  implements UseCase<GetApiStatusInput, Result<ApiStatusDTO, AppError>>
{
  constructor(private readonly registry: IVectorRepositoryRegistry) {}

  async execute(
    input: GetApiStatusInput,
  ): Promise<Result<ApiStatusDTO, AppError>> {
    const qdrantReachable = await this.registry.isReachable();

    return Result.ok<ApiStatusDTO>({
      status: qdrantReachable ? 'ok' : 'degraded',
      service: 'rag-api',
      env: input.env,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      dependencies: {
        qdrant: qdrantReachable ? 'reachable' : 'unreachable',
      },
    });
  }
}
