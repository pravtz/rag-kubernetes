import { Request, Response } from 'express';
import { RoutedQueryUseCase } from '../../../application/use-cases/RoutedQueryUseCase';
import { GetQdrantInfoUseCase } from '../../../application/use-cases/GetQdrantInfoUseCase';
import { AppError } from '../../../../../shared/errors/AppError';
import { CollectionInfo } from '../../../application/ports/IQueryRouter';

export class QueryController {
  constructor(
    private readonly routedQueryUseCase: RoutedQueryUseCase,
    private readonly getQdrantInfoUseCase: GetQdrantInfoUseCase,
    private readonly ragConfig: {
      topK: number;
      embeddingModel: string;
      collections: CollectionInfo[];
    },
  ) {}

  async handle(req: Request, res: Response): Promise<void> {
    const { question, forceCollections } = req.body as {
      question?: string;
      forceCollections?: string[];
    };

    if (!question || question.trim() === '') {
      throw new AppError('question is required', 400, 'VALIDATION_ERROR');
    }

    try {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.flushHeaders();

      const result = await this.routedQueryUseCase.execute({
        dto: { question, forceCollections },
        collections: this.ragConfig.collections,
        topK: this.ragConfig.topK,
        onToken: (token) => {
          res.write(token);
        },
      });

      if (result.isFailure) {
        console.error('Query use case failed:', result.error);
      }

      if (result.isOk && result.value) {
        const metrics = result.value;
        res.write(`\n\n---METRICS---\n${JSON.stringify(metrics)}`);
        console.log('[QueryMetrics]', JSON.stringify(metrics));
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
    const result = await this.getQdrantInfoUseCase.execute();

    if (result.isFailure) {
      throw result.error;
    }

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      collections: result.value.diagnostics,
      rag: {
        topK: this.ragConfig.topK,
        embeddingModel: this.ragConfig.embeddingModel,
        collectionNames: this.ragConfig.collections.map((c) => c.name),
      },
    });
  }
}
