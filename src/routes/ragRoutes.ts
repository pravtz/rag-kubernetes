import { Router } from 'express';
import { uploadPdfHandler } from '../middleware/uploadMiddleware';
import { asyncHandler } from '../utils/asyncHandler';
import {
  ingest,
  query,
  getApiStatus,
  getQdrantInfo,
  getApiReadiness,
} from '../controllers/ragController';

const router = Router();

router.get('/status', asyncHandler(getApiStatus));
router.get('/ready', asyncHandler(getApiReadiness));
router.get('/qdrant-info', asyncHandler(getQdrantInfo));

// Wrap multer so its errors are forwarded as JSON rather than raw Express errors
router.post(
  '/ingest',
  uploadPdfHandler,
  asyncHandler(ingest),
);

router.post('/query', asyncHandler(query));
router.post('/question', asyncHandler(query));
router.post('/pergunta', asyncHandler(query));

export default router;
