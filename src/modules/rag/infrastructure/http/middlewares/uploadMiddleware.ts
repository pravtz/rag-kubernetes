import multer from 'multer';
import path from 'path';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError } from '../../../../../shared/errors/AppError';

const storage = multer.diskStorage({
  destination: '/tmp',
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

function pdfFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  const ext = path.extname(file.originalname).toLowerCase();
  const isPdf = file.mimetype === 'application/pdf' || ext === '.pdf';

  if (isPdf) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'));
  }
}

export const uploadPdf = multer({
  storage,
  fileFilter: pdfFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
}).single('file');

export const uploadPdfHandler: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  uploadPdf(req, res, (err) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      next(
        new AppError('File too large. Maximum size is 50MB', 400, 'UPLOAD_ERROR', {
          multerCode: err.code,
        }),
      );
      return;
    }

    next(new AppError((err as Error).message, 400, 'UPLOAD_ERROR'));
  });
};
