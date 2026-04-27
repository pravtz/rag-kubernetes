import { getVectorSize } from '../utils/qdrant';

// Mock da configuração
jest.mock('../config/config', () => ({
  config: {
    openai: {
      apiKey: 'test-key',
      embeddingModel: 'text-embedding-3-small',
    },
    qdrant: {
      url: 'http://localhost:6333',
      apiKey: undefined,
      collectionName: 'test_collection',
    },
  },
}));

// Mock do QdrantClient
jest.mock('@qdrant/js-client-rest');

describe('Qdrant utils', () => {
  describe('getVectorSize', () => {
    it('should return 1536 for text-embedding-3-small', () => {
      expect(getVectorSize()).toBe(1536);
    });

    it('should return 3072 for text-embedding-3-large', () => {
      const mockConfig = require('../config/config');
      mockConfig.config.openai.embeddingModel = 'text-embedding-3-large';
      expect(getVectorSize()).toBe(3072);
    });

    it('should return 1536 for text-embedding-ada-002', () => {
      const mockConfig = require('../config/config');
      mockConfig.config.openai.embeddingModel = 'text-embedding-ada-002';
      expect(getVectorSize()).toBe(1536);
    });

    it('should return 1536 as default for unknown model', () => {
      const mockConfig = require('../config/config');
      mockConfig.config.openai.embeddingModel = 'unknown-model';
      expect(getVectorSize()).toBe(1536);
    });
  });
});
