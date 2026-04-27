import { UseCase } from '../../../../shared/application/UseCase';
import { Result } from '../../../../shared/application/Result';
import { AppError } from '../../../../shared/errors/AppError';
import { InfrastructureError } from '../../../../shared/errors/InfrastructureError';
import { ReadinessDTO } from '../dtos/ReadinessDTO';
import { IVectorRepository } from '../../domain/repositories/IVectorRepository';

export class GetReadinessUseCase
  implements UseCase<void, Result<ReadinessDTO, AppError>>
{
  constructor(private readonly vectorRepository: IVectorRepository) {}

  async execute(): Promise<Result<ReadinessDTO, AppError>> {
    let qdrantReachable = false;

    try {
      qdrantReachable = await this.vectorRepository.isReachable();
    } catch {
      throw new InfrastructureError(
        'Readiness check failed',
        503,
        'DEPENDENCY_ERROR',
      );
    }

    if (!qdrantReachable) {
      return Result.ok<ReadinessDTO>({
        status: 'not-ready',
        timestamp: new Date().toISOString(),
        checks: {
          qdrant: 'unreachable',
          collection: 'unknown',
        },
      });
    }

    let diagnostics;
    try {
      diagnostics = await this.vectorRepository.getDiagnostics();
    } catch {
      throw new InfrastructureError(
        'Readiness check failed',
        503,
        'DEPENDENCY_ERROR',
      );
    }

    const isReady = diagnostics.reachable && diagnostics.collectionExists;

    return Result.ok<ReadinessDTO>({
      status: isReady ? 'ready' : 'not-ready',
      timestamp: new Date().toISOString(),
      checks: {
        qdrant: diagnostics.reachable ? 'reachable' : 'unreachable',
        collection: diagnostics.collectionExists ? 'present' : 'missing',
      },
      collectionName: diagnostics.collectionName,
      pointsCount: diagnostics.pointsCount,
    });
  }
}
