import { Router } from 'express';
import { asyncHandler } from '../../../../../shared/infrastructure/middleware/asyncHandler';
import { uploadPdfHandler } from '../middlewares/uploadMiddleware';
import { IngestController } from '../controllers/IngestController';
import { QueryController } from '../controllers/QueryController';

export function createRagRoutes(
  ingestController: IngestController,
  queryController: QueryController,
): Router {
  const router = Router();

  router.post(
    '/ingest',
    uploadPdfHandler,
    asyncHandler((req, res, next) => ingestController.handle(req, res, next)),
  );

  router.post('/query', asyncHandler((req, res) => queryController.handle(req, res)));
  router.post('/question', asyncHandler((req, res) => queryController.handle(req, res)));
  router.post('/pergunta', asyncHandler((req, res) => queryController.handle(req, res)));

  router.get('/qdrant-info', asyncHandler((req, res) => queryController.getQdrantInfo(req, res)));

  return router;
}
