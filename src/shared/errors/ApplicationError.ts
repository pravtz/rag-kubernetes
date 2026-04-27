import { AppError } from './AppError';

export class ApplicationError extends AppError {
  constructor(
    message: string,
    statusCode = 400,
    code = 'APPLICATION_ERROR',
    details?: unknown,
  ) {
    super(message, statusCode, code, details);
    this.name = 'ApplicationError';
  }
}
