import { Router } from 'express';
import { asyncHandler } from '../../../../../shared/infrastructure/middleware/asyncHandler';
import { HealthController } from '../controllers/HealthController';

export function createHealthRoutes(healthController: HealthController): Router {
  const router = Router();

  router.get(
    '/status',
    asyncHandler((req, res) => healthController.getStatus(req, res)),
  );
  router.get(
    '/ready',
    asyncHandler((req, res) => healthController.getReadiness(req, res)),
  );

  return router;
}
