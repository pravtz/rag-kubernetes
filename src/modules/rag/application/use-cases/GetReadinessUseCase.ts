import { UseCase } from '../../../../shared/application/UseCase';
import { Result } from '../../../../shared/application/Result';
import { AppError } from '../../../../shared/errors/AppError';
import { InfrastructureError } from '../../../../shared/errors/InfrastructureError';
import { ReadinessDTO } from '../dtos/ReadinessDTO';
import { IVectorRepositoryRegistry } from '../../domain/repositories/IVectorRepositoryRegistry';

export class GetReadinessUseCase
  implements UseCase<void, Result<ReadinessDTO, AppError>>
{
  constructor(private readonly registry: IVectorRepositoryRegistry) {}

  async execute(): Promise<Result<ReadinessDTO, AppError>> {
    let qdrantReachable = false;

    try {
      qdrantReachable = await this.registry.isReachable();
    } catch {
      return Result.fail(
        new InfrastructureError(
          'Readiness check failed',
          503,
          'DEPENDENCY_ERROR',
        ),
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

    let allDiagnostics;
    try {
      allDiagnostics = await this.registry.getDiagnosticsAll();
    } catch {
      return Result.fail(
        new InfrastructureError(
          'Readiness check failed',
          503,
          'DEPENDENCY_ERROR',
        ),
      );
    }

    const allReady = allDiagnostics.every(
      (d) => d.reachable && d.collectionExists,
    );

    const collectionNames = allDiagnostics
      .map((d) => d.collectionName)
      .join(', ');

    const totalPoints = allDiagnostics.reduce(
      (sum, d) => sum + (d.pointsCount ?? 0),
      0,
    );

    return Result.ok<ReadinessDTO>({
      status: allReady ? 'ready' : 'not-ready',
      timestamp: new Date().toISOString(),
      checks: {
        qdrant: 'reachable',
        collection: allReady ? 'present' : 'missing',
      },
      collectionName: collectionNames,
      pointsCount: totalPoints,
    });
  }
}
