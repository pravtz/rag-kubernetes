import { getApiStatus, getApiReadiness, getQdrantInfo } from '../controllers/ragController';
import * as qdrantUtils from '../utils/qdrant';

// Mock da configuração
jest.mock('../config/config', () => ({
  config: {
    port: 3000,
    nodeEnv: 'test',
    openai: {
      apiKey: 'test-key',
      chatModel: 'gpt-4o-mini',
      embeddingModel: 'text-embedding-3-small',
    },
    qdrant: {
      url: 'http://localhost:6333',
      collectionName: 'test_collection',
    },
    chunking: {
      topK: 4,
    },
  },
}));

// Mock do Qdrant utils
jest.mock('../utils/qdrant');

describe('RAG Controller', () => {
  let mockRes: any;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      flushHeaders: jest.fn().mockReturnThis(),
      write: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      headersSent: false,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getApiStatus', () => {
    it('should return status 200 when Qdrant is reachable', async () => {
      (qdrantUtils.isQdrantReachable as jest.Mock).mockResolvedValueOnce(true);

      const mockReq = {} as any;

      await getApiStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ok',
          service: 'rag-api',
          dependencies: expect.objectContaining({
            qdrant: 'reachable',
          }),
        }),
      );
    });

    it('should return status 503 when Qdrant is unreachable', async () => {
      (qdrantUtils.isQdrantReachable as jest.Mock).mockResolvedValueOnce(false);

      const mockReq = {} as any;

      await getApiStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'degraded',
          dependencies: expect.objectContaining({
            qdrant: 'unreachable',
          }),
        }),
      );
    });

    it('should include uptime seconds in response', async () => {
      (qdrantUtils.isQdrantReachable as jest.Mock).mockResolvedValueOnce(true);

      const mockReq = {} as any;

      await getApiStatus(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          uptimeSeconds: expect.any(Number),
        }),
      );
    });
  });

  describe('getApiReadiness', () => {
    it('should return 200 when ready (Qdrant reachable and collection exists)', async () => {
      (qdrantUtils.isQdrantReachable as jest.Mock).mockResolvedValueOnce(true);
      (qdrantUtils.getQdrantDiagnostics as jest.Mock).mockResolvedValueOnce({
        reachable: true,
        collectionExists: true,
        collectionName: 'test_collection',
        pointsCount: 100,
      });

      const mockReq = {} as any;

      await getApiReadiness(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ready',
          checks: expect.objectContaining({
            qdrant: 'reachable',
            collection: 'present',
          }),
        }),
      );
    });

    it('should return 503 when collection does not exist', async () => {
      (qdrantUtils.isQdrantReachable as jest.Mock).mockResolvedValueOnce(true);
      (qdrantUtils.getQdrantDiagnostics as jest.Mock).mockResolvedValueOnce({
        reachable: true,
        collectionExists: false,
        collectionName: 'test_collection',
        pointsCount: null,
      });

      const mockReq = {} as any;

      await getApiReadiness(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'not-ready',
          checks: expect.objectContaining({
            collection: 'missing',
          }),
        }),
      );
    });

    it('should return 503 when Qdrant is unreachable', async () => {
      (qdrantUtils.isQdrantReachable as jest.Mock).mockResolvedValueOnce(false);

      const mockReq = {} as any;

      await getApiReadiness(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'not-ready',
          checks: expect.objectContaining({
            qdrant: 'unreachable',
          }),
        }),
      );
    });

    it('should handle errors gracefully', async () => {
      (qdrantUtils.isQdrantReachable as jest.Mock).mockRejectedValueOnce(
        new Error('Connection failed'),
      );

      const mockReq = {} as any;

      await expect(getApiReadiness(mockReq, mockRes)).rejects.toThrow('Readiness check failed');
    });
  });

  describe('getQdrantInfo', () => {
    it('should return Qdrant diagnostics when successful', async () => {
      const diagnostics = {
        qdrantUrl: 'http://localhost:6333',
        collectionName: 'test_collection',
        reachable: true,
        collectionExists: true,
        totalCollections: 1,
        pointsCount: 42,
        expectedVectorSize: 1536,
        collectionStatus: 'green',
      };

      (qdrantUtils.getQdrantDiagnostics as jest.Mock).mockResolvedValueOnce(diagnostics);

      const mockReq = {} as any;

      await getQdrantInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ok',
          qdrant: diagnostics,
        }),
      );
    });

    it('should return error status when diagnostics fail', async () => {
      (qdrantUtils.getQdrantDiagnostics as jest.Mock).mockRejectedValueOnce(
        new Error('Qdrant connection failed'),
      );

      const mockReq = {} as any;

      await expect(getQdrantInfo(mockReq, mockRes)).rejects.toThrow(
        'Failed to read Qdrant diagnostics',
      );
    });

    it('should include RAG configuration in response', async () => {
      const diagnostics = {
        qdrantUrl: 'http://localhost:6333',
        collectionName: 'test_collection',
        reachable: true,
        collectionExists: true,
        totalCollections: 1,
        pointsCount: 50,
        expectedVectorSize: 1536,
        collectionStatus: 'green',
      };

      (qdrantUtils.getQdrantDiagnostics as jest.Mock).mockResolvedValueOnce(diagnostics);

      const mockReq = {} as any;

      await getQdrantInfo(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          rag: expect.objectContaining({
            topK: 4,
            embeddingModel: 'text-embedding-3-small',
            collectionName: 'test_collection',
          }),
        }),
      );
    });
  });
});
