import multer from 'multer';
import { errorHandler, notFoundHandler } from '../middleware/errorMiddleware';
import { AppError } from '../utils/appError';

jest.mock('../config/config', () => ({
  config: {
    nodeEnv: 'test',
  },
}));

describe('Error middleware', () => {
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      headersSent: false,
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 404 payload for unknown routes', () => {
    notFoundHandler({} as any, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'NOT_FOUND',
          message: 'Route not found',
        }),
      }),
    );
  });

  it('should return AppError payload and status code', () => {
    const err = new AppError('Invalid request', 400, 'VALIDATION_ERROR');

    errorHandler(err, {} as any, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
        }),
      }),
    );
  });

  it('should map MulterError to 400 upload error', () => {
    const err = new multer.MulterError('LIMIT_FILE_SIZE');

    errorHandler(err, {} as any, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'UPLOAD_ERROR',
        }),
      }),
    );
  });

  it('should map unknown errors to internal server error', () => {
    errorHandler(new Error('boom'), {} as any, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        }),
      }),
    );
  });

  it('should delegate when headers were already sent', () => {
    mockRes.headersSent = true;
    const err = new Error('late error');

    errorHandler(err, {} as any, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(err);
    expect(mockRes.status).not.toHaveBeenCalled();
  });
});
