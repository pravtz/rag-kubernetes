import { ValueObject } from '../../../../shared/domain/ValueObject';

export interface CollectionTarget {
  collectionName: string;
  confidence: number;
}

interface QueryIntentProps {
  targets: CollectionTarget[];
}

export class QueryIntent extends ValueObject<QueryIntentProps> {
  get targets(): readonly CollectionTarget[] {
    return this.props.targets;
  }

  private constructor(props: QueryIntentProps) {
    super(props);
  }

  static create(targets: CollectionTarget[]): QueryIntent {
    if (!targets || targets.length === 0) {
      throw new Error('QueryIntent must have at least one target');
    }
    return new QueryIntent({ targets: [...targets] });
  }

  equals(other: ValueObject<QueryIntentProps>): boolean {
    if (!(other instanceof QueryIntent)) return false;
    if (this.props.targets.length !== other.props.targets.length) return false;
    return this.props.targets.every(
      (t, i) =>
        t.collectionName === other.props.targets[i].collectionName &&
        t.confidence === other.props.targets[i].confidence,
    );
  }
}
