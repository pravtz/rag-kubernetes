import { ValueObject } from '../../../../shared/domain/ValueObject';
import { EmptyQuestionError } from '../errors/DomainErrors';

interface QuestionProps {
  value: string;
}

export class Question extends ValueObject<QuestionProps> {
  get value(): string {
    return this.props.value;
  }

  private constructor(props: QuestionProps) {
    super(props);
  }

  static create(value: string): Question {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new EmptyQuestionError();
    }
    return new Question({ value: trimmed });
  }

  equals(other: ValueObject<QuestionProps>): boolean {
    if (!(other instanceof Question)) return false;
    return this.props.value === other.props.value;
  }
}
