import { IngestResultDTO } from '../dtos/IngestResultDTO';

export class IngestResultMapper {
  static toDTO(chunksCount: number): IngestResultDTO {
    return {
      message: 'PDF ingested successfully',
      chunks: chunksCount,
    };
  }
}
