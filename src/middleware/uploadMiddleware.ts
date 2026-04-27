import multer from 'multer';
import path from 'path';
import { Request } from 'express';

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

// 50 MB limit — adjust via environment if needed
export const uploadPdf = multer({
  storage,
  fileFilter: pdfFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
}).single('file');
