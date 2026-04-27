import { RawDocument } from '../../domain/types';

export { RawDocument };

export interface IPdfLoader {
  load(filePath: string): Promise<RawDocument[]>;
}
