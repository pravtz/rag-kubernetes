import { splitDocuments } from '../utils/chunking';
import { Document } from '@langchain/core/documents';

// Mock da configuração
jest.mock('../config/config', () => ({
  config: {
    chunking: {
      chunkSize: 1000,
      chunkOverlap: 200,
    },
  },
}));

describe('Chunking utils', () => {
  describe('splitDocuments', () => {
    it('should split a long document into multiple chunks', async () => {
      const longText = 'word '.repeat(500); // 2500 characters
      const doc = new Document({ pageContent: longText });

      const chunks = await splitDocuments([doc]);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].pageContent).toBeTruthy();
    });

    it('should preserve metadata when splitting', async () => {
      const doc = new Document({
        pageContent: 'test '.repeat(400),
        metadata: { source: 'test.pdf', page: 1 },
      });

      const chunks = await splitDocuments([doc]);

      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach((chunk) => {
        expect(chunk.metadata.source).toBe('test.pdf');
        expect(chunk.metadata.page).toBe(1);
      });
    });

    it('should handle multiple documents', async () => {
      const doc1 = new Document({ pageContent: 'content1 '.repeat(300) });
      const doc2 = new Document({ pageContent: 'content2 '.repeat(300) });

      const chunks = await splitDocuments([doc1, doc2]);

      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should handle short documents without splitting', async () => {
      const shortText = 'This is a short document.';
      const doc = new Document({ pageContent: shortText });

      const chunks = await splitDocuments([doc]);

      expect(chunks.length).toBeGreaterThanOrEqual(1);
      expect(chunks[0].pageContent).toContain('short');
    });

    it('should apply configured chunk size', async () => {
      const repeatText = 'word '.repeat(500); // bigger than chunk size
      const doc = new Document({ pageContent: repeatText });

      const chunks = await splitDocuments([doc]);

      chunks.forEach((chunk) => {
        // Each chunk should not exceed the configured chunk size by much
        // (LangChain's splitter is approximate)
        expect(chunk.pageContent.length).toBeLessThanOrEqual(1500);
      });
    });
  });
});
