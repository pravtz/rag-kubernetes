import { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import { IngestPdfUseCase } from '../../../application/use-cases/IngestPdfUseCase';
import { AppError } from '../../../../../shared/errors/AppError';

export class IngestController {
  constructor(
    private readonly ingestPdfUseCase: IngestPdfUseCase,
    private readonly validCollectionNames: string[],
  ) {}

  async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.file) {
      next(new AppError('No PDF file provided', 400, 'VALIDATION_ERROR'));
      return;
    }

    const collectionName =
      (req.body as { collection?: string }).collection ??
      this.validCollectionNames[0];

    if (!this.validCollectionNames.includes(collectionName)) {
      next(
        new AppError(
          `Unknown collection: ${collectionName}. Valid: ${this.validCollectionNames.join(', ')}`,
          400,
          'VALIDATION_ERROR',
        ),
      );
      return;
    }

    const filePath = req.file.path;

    try {
      const result = await this.ingestPdfUseCase.execute({
        filePath,
        collectionName,
      });

      if (result.isFailure) {
        next(result.error);
        return;
      }

      res.status(200).json(result.value);
    } catch (error) {
      next(error);
    } finally {
      fs.unlink(filePath, (err) => {
        if (err) console.error('Failed to delete temp file:', err);
      });
    }
  }
}
