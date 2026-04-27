import { Request, Response } from 'express';
import { QueryDocumentsUseCase } from '../../../application/use-cases/QueryDocumentsUseCase';
import { AppError } from '../../../../../shared/errors/AppError';
import { InfrastructureError } from '../../../../../shared/errors/InfrastructureError';
import { IVectorRepository, VectorStoreDiagnostics } from '../../../domain/repositories/IVectorRepository';

export class QueryController {
  constructor(
    private readonly queryDocumentsUseCase: QueryDocumentsUseCase,
    private readonly vectorRepository: IVectorRepository,
    private readonly ragConfig: { topK: number; embeddingModel: string; collectionName: string },
  ) {}

  async handle(req: Request, res: Response): Promise<void> {
    const { question } = req.body as { question?: string };

    if (!question || question.trim() === '') {
      throw new AppError('question is required', 400, 'VALIDATION_ERROR');
    }

    try {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.flushHeaders();

      const result = await this.queryDocumentsUseCase.execute({
        question,
        topK: this.ragConfig.topK,
        onToken: (token) => {
          res.write(token);
        },
      });

      if (result.isFailure) {
        console.error('Query use case failed:', result.error);
      }

      res.end();
    } catch (error) {
      if (res.headersSent) {
        console.error('Streaming query failed after headers were sent:', error);
        res.end();
        return;
      }
      throw error;
    }
  }

  async getQdrantInfo(_req: Request, res: Response): Promise<void> {
    let diagnostics: VectorStoreDiagnostics;

    try {
      diagnostics = await this.vectorRepository.getDiagnostics();
    } catch {
      throw new InfrastructureError(
        'Failed to read Qdrant diagnostics',
        503,
        'DEPENDENCY_ERROR',
      );
    }

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      qdrant: diagnostics,
      rag: {
        topK: this.ragConfig.topK,
        embeddingModel: this.ragConfig.embeddingModel,
        collectionName: this.ragConfig.collectionName,
      },
    });
  }
}
