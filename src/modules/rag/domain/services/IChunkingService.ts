import { RawDocument } from '../types';

export interface IChunkingService {
  split(documents: RawDocument[]): Promise<RawDocument[]>;
}
