import { Router, Request, Response, NextFunction } from 'express';
import { uploadPdf } from '../middleware/uploadMiddleware';
import {
  ingest,
  query,
  getApiStatus,
  getQdrantInfo,
  getApiReadiness,
} from '../controllers/ragController';

const router = Router();

router.get('/status', getApiStatus);
router.get('/ready', getApiReadiness);
router.get('/qdrant-info', getQdrantInfo);

// Wrap multer so its errors are forwarded as JSON rather than raw Express errors
router.post(
  '/ingest',
  (req: Request, res: Response, next: NextFunction) => {
    uploadPdf(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: (err as Error).message });
        return;
      }
      next();
    });
  },
  ingest,
);

router.post('/query', query);
router.post('/question', query);
router.post('/pergunta', query);

export default router;
