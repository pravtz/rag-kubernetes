import { ValueObject } from '../../../../shared/domain/ValueObject';
import { ChunkMetadata } from './ChunkMetadata';

export interface ChunkProps {
  content: string;
  metadata: ChunkMetadata;
}

export class Chunk extends ValueObject<ChunkProps> {
  get content(): string {
    return this.props.content;
  }

  get metadata(): ChunkMetadata {
    return this.props.metadata;
  }

  private constructor(props: ChunkProps) {
    super(props);
  }

  static create(props: ChunkProps): Chunk {
    return new Chunk(props);
  }

  equals(other: ValueObject<ChunkProps>): boolean {
    if (!(other instanceof Chunk)) return false;
    return (
      this.props.content === other.props.content &&
      this.props.metadata.equals(other.props.metadata)
    );
  }
}
