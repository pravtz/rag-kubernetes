import { Request, Response } from 'express';
import { GetApiStatusUseCase } from '../../../application/use-cases/GetApiStatusUseCase';
import { GetReadinessUseCase } from '../../../application/use-cases/GetReadinessUseCase';

export class HealthController {
  constructor(
    private readonly getApiStatusUseCase: GetApiStatusUseCase,
    private readonly getReadinessUseCase: GetReadinessUseCase,
    private readonly env: string,
  ) {}

  async getStatus(_req: Request, res: Response): Promise<void> {
    const result = await this.getApiStatusUseCase.execute({ env: this.env });
    const dto = result.value;
    const statusCode = dto.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(dto);
  }

  async getReadiness(_req: Request, res: Response): Promise<void> {
    const result = await this.getReadinessUseCase.execute();

    if (result.isFailure) {
      throw result.error;
    }

    const dto = result.value;
    const statusCode = dto.status === 'ready' ? 200 : 503;
    res.status(statusCode).json(dto);
  }
}
