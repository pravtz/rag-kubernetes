import { v4 as uuidv4 } from 'uuid';
import { UseCase } from '../../../../shared/application/UseCase';
import { Result } from '../../../../shared/application/Result';
import { AppError } from '../../../../shared/errors/AppError';
import { IngestResultDTO } from '../dtos/IngestResultDTO';
import { IngestResultMapper } from '../mappers/IngestResultMapper';
import { IPdfLoader } from '../ports/IPdfLoader';
import { IChunkingService } from '../../domain/services/IChunkingService';
import { IVectorRepository } from '../../domain/repositories/IVectorRepository';
import { Chunk } from '../../domain/value-objects/Chunk';
import { ChunkMetadata } from '../../domain/value-objects/ChunkMetadata';

interface IngestPdfInput {
  filePath: string;
}

export class IngestPdfUseCase
  implements UseCase<IngestPdfInput, Result<IngestResultDTO, AppError>>
{
  constructor(
    private readonly pdfLoader: IPdfLoader,
    private readonly chunkingService: IChunkingService,
    private readonly vectorRepository: IVectorRepository,
  ) {}

  async execute(
    input: IngestPdfInput,
  ): Promise<Result<IngestResultDTO, AppError>> {
    const rawDocs = await this.pdfLoader.load(input.filePath);
    const splitDocs = await this.chunkingService.split(rawDocs);

    const chunks = splitDocs.map((doc, index) =>
      Chunk.create({
        content: doc.pageContent,
        metadata: ChunkMetadata.create({
          chunkId: uuidv4(),
          chunkIndex: index,
          source: (doc.metadata.source as string) ?? '',
          page: (doc.metadata.page as number) ?? 0,
        }),
      }),
    );

    await this.vectorRepository.ensureCollection();
    await this.vectorRepository.addDocuments(chunks);

    return Result.ok(IngestResultMapper.toDTO(chunks.length));
  }
}
