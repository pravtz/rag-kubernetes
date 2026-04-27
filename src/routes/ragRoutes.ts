import { Router, Request, Response, NextFunction } from 'express';
import { uploadPdf } from '../middleware/uploadMiddleware';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/appError';
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
  (req: Request, res: Response, next: NextFunction) => {
    uploadPdf(req, res, (err) => {
      if (err) {
        next(new AppError((err as Error).message, 400, 'UPLOAD_ERROR'));
        return;
      }
      next();
    });
  },
  asyncHandler(ingest),
);

router.post('/query', asyncHandler(query));
router.post('/question', asyncHandler(query));
router.post('/pergunta', asyncHandler(query));

export default router;
