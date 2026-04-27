import { AppError } from './AppError';

export class InfrastructureError extends AppError {
  constructor(
    message: string,
    statusCode = 500,
    code = 'INFRASTRUCTURE_ERROR',
    details?: unknown,
  ) {
    super(message, statusCode, code, details);
    this.name = 'InfrastructureError';
  }
}
