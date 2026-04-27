import { ValueObject } from '../../../../shared/domain/ValueObject';
import { Chunk } from './Chunk';

interface ScoredChunkProps {
  chunk: Chunk;
  score: number;
  collectionName: string;
}

export class ScoredChunk extends ValueObject<ScoredChunkProps> {
  get chunk(): Chunk {
    return this.props.chunk;
  }

  get score(): number {
    return this.props.score;
  }

  get collectionName(): string {
    return this.props.collectionName;
  }

  private constructor(props: ScoredChunkProps) {
    super(props);
  }

  static create(props: ScoredChunkProps): ScoredChunk {
    return new ScoredChunk(props);
  }

  equals(other: ValueObject<ScoredChunkProps>): boolean {
    if (!(other instanceof ScoredChunk)) return false;
    return (
      this.props.chunk.equals(other.props.chunk) &&
      this.props.score === other.props.score &&
      this.props.collectionName === other.props.collectionName
    );
  }
}
