import { Entity } from '../../../../shared/domain/Entity';

interface DocumentProps {
  filename: string;
  totalPages: number;
  createdAt: Date;
}

export class RagDocument extends Entity<string> {
  private readonly _filename: string;
  private readonly _totalPages: number;
  private readonly _createdAt: Date;

  private constructor(id: string, props: DocumentProps) {
    super(id);
    this._filename = props.filename;
    this._totalPages = props.totalPages;
    this._createdAt = props.createdAt;
  }

  get filename(): string {
    return this._filename;
  }

  get totalPages(): number {
    return this._totalPages;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  static create(id: string, props: DocumentProps): RagDocument {
    return new RagDocument(id, props);
  }
}
