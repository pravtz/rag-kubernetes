import { UseCase } from '../../../../shared/application/UseCase';
import { Result } from '../../../../shared/application/Result';
import { AppError } from '../../../../shared/errors/AppError';
import { InfrastructureError } from '../../../../shared/errors/InfrastructureError';
import { IVectorRepositoryRegistry } from '../../domain/repositories/IVectorRepositoryRegistry';
import { VectorStoreDiagnostics } from '../../domain/repositories/IVectorRepository';

interface QdrantInfoOutput {
  diagnostics: VectorStoreDiagnostics[];
}

export class GetQdrantInfoUseCase
  implements UseCase<void, Result<QdrantInfoOutput, AppError>>
{
  constructor(private readonly registry: IVectorRepositoryRegistry) {}

  async execute(): Promise<Result<QdrantInfoOutput, AppError>> {
    try {
      const diagnostics = await this.registry.getDiagnosticsAll();
      return Result.ok({ diagnostics });
    } catch {
      return Result.fail(
        new InfrastructureError(
          'Failed to read Qdrant diagnostics',
          503,
          'DEPENDENCY_ERROR',
        ),
      );
    }
  }
}
