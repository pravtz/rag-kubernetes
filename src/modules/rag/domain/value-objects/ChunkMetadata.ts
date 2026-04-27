import { ValueObject } from '../../../../shared/domain/ValueObject';

export interface ChunkMetadataProps {
  chunkId: string;
  chunkIndex: number;
  source: string;
  page: number;
  collectionName?: string;
}

export class ChunkMetadata extends ValueObject<ChunkMetadataProps> {
  get chunkId(): string {
    return this.props.chunkId;
  }

  get chunkIndex(): number {
    return this.props.chunkIndex;
  }

  get source(): string {
    return this.props.source;
  }

  get page(): number {
    return this.props.page;
  }

  get collectionName(): string | undefined {
    return this.props.collectionName;
  }

  private constructor(props: ChunkMetadataProps) {
    super(props);
  }

  static create(props: ChunkMetadataProps): ChunkMetadata {
    return new ChunkMetadata(props);
  }

  equals(other: ValueObject<ChunkMetadataProps>): boolean {
    if (!(other instanceof ChunkMetadata)) return false;
    return (
      this.props.chunkId === other.props.chunkId &&
      this.props.chunkIndex === other.props.chunkIndex &&
      this.props.source === other.props.source &&
      this.props.page === other.props.page &&
      this.props.collectionName === other.props.collectionName
    );
  }
}
