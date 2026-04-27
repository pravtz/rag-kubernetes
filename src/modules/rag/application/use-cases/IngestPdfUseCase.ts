import { v4 as uuidv4 } from 'uuid';
import { UseCase } from '../../../../shared/application/UseCase';
import { Result } from '../../../../shared/application/Result';
import { AppError } from '../../../../shared/errors/AppError';
import { IngestResultDTO } from '../dtos/IngestResultDTO';
import { IngestResultMapper } from '../mappers/IngestResultMapper';
import { IPdfLoader } from '../ports/IPdfLoader';
import { IChunkingService } from '../ports/IChunkingService';
import { IVectorRepositoryRegistry } from '../../domain/repositories/IVectorRepositoryRegistry';
import { Chunk } from '../../domain/value-objects/Chunk';
import { ChunkMetadata } from '../../domain/value-objects/ChunkMetadata';

interface IngestPdfInput {
  filePath: string;
  collectionName: string;
}

export class IngestPdfUseCase
  implements UseCase<IngestPdfInput, Result<IngestResultDTO, AppError>>
{
  constructor(
    private readonly pdfLoader: IPdfLoader,
    private readonly chunkingService: IChunkingService,
    private readonly registry: IVectorRepositoryRegistry,
  ) {}

  async execute(
    input: IngestPdfInput,
  ): Promise<Result<IngestResultDTO, AppError>> {
    const vectorRepository = this.registry.get(input.collectionName);

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
          collectionName: input.collectionName,
        }),
      }),
    );

    await vectorRepository.ensureCollection();
    await vectorRepository.addDocuments(chunks);

    return Result.ok(IngestResultMapper.toDTO(chunks.length));
  }
}
