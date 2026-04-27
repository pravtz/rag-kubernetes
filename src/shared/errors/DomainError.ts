import { AppError } from './AppError';

export class DomainError extends AppError {
  constructor(
    message: string,
    code = 'DOMAIN_ERROR',
    details?: unknown,
  ) {
    super(message, 400, code, details);
    this.name = 'DomainError';
  }
}
