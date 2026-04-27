import { RawDocument } from '../../domain/types';

export interface IChunkingService {
  split(documents: RawDocument[]): Promise<RawDocument[]>;
}
