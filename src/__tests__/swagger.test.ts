import { swaggerDocument } from '../config/swagger';

describe('Swagger Document', () => {
  it('should use OpenAPI 3.0.3', () => {
    expect(swaggerDocument.openapi).toBe('3.0.3');
  });

  it('should have correct API info', () => {
    expect(swaggerDocument.info).toEqual(
      expect.objectContaining({
        title: 'RAG API',
        version: '1.0.0',
      }),
    );
    expect(swaggerDocument.info.description).toBeDefined();
  });

  it('should define server base path', () => {
    expect(swaggerDocument.servers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: '/api/rag' }),
      ]),
    );
  });

  it('should define Health and RAG tags', () => {
    const tagNames = swaggerDocument.tags.map((t: { name: string }) => t.name);
    expect(tagNames).toContain('Health');
    expect(tagNames).toContain('RAG');
  });

  describe('paths', () => {
    const expectedPaths = ['/status', '/ready', '/qdrant-info', '/ingest', '/query'];

    it.each(expectedPaths)('should define %s path', (path) => {
      expect(swaggerDocument.paths).toHaveProperty(path);
    });

    it('GET /status should have 200 and 503 responses', () => {
      const statusPath = swaggerDocument.paths['/status'].get;
      expect(statusPath.tags).toContain('Health');
      expect(statusPath.responses).toHaveProperty('200');
      expect(statusPath.responses).toHaveProperty('503');
    });

    it('GET /ready should have 200 and 503 responses', () => {
      const readyPath = swaggerDocument.paths['/ready'].get;
      expect(readyPath.tags).toContain('Health');
      expect(readyPath.responses).toHaveProperty('200');
      expect(readyPath.responses).toHaveProperty('503');
    });

    it('GET /qdrant-info should have 200 and 503 responses', () => {
      const qdrantPath = swaggerDocument.paths['/qdrant-info'].get;
      expect(qdrantPath.tags).toContain('Health');
      expect(qdrantPath.responses).toHaveProperty('200');
      expect(qdrantPath.responses).toHaveProperty('503');
    });

    it('POST /ingest should accept multipart/form-data with file', () => {
      const ingestPath = swaggerDocument.paths['/ingest'].post;
      expect(ingestPath.tags).toContain('RAG');
      expect(ingestPath.requestBody.required).toBe(true);

      const schema =
        ingestPath.requestBody.content['multipart/form-data'].schema;
      expect(schema.required).toContain('file');
      expect(schema.properties.file.format).toBe('binary');
    });

    it('POST /ingest should have 200 and 400 responses', () => {
      const ingestPath = swaggerDocument.paths['/ingest'].post;
      expect(ingestPath.responses).toHaveProperty('200');
      expect(ingestPath.responses).toHaveProperty('400');
    });

    it('POST /query should accept JSON with question', () => {
      const queryPath = swaggerDocument.paths['/query'].post;
      expect(queryPath.tags).toContain('RAG');
      expect(queryPath.requestBody.required).toBe(true);

      const ref = queryPath.requestBody.content['application/json'].schema.$ref;
      expect(ref).toBe('#/components/schemas/QueryRequest');
    });

    it('POST /query should have 200 and 400 responses', () => {
      const queryPath = swaggerDocument.paths['/query'].post;
      expect(queryPath.responses).toHaveProperty('200');
      expect(queryPath.responses).toHaveProperty('400');
    });
  });

  describe('components/schemas', () => {
    const expectedSchemas = [
      'ApiStatus',
      'Readiness',
      'QdrantInfo',
      'QueryRequest',
      'IngestResult',
      'ErrorResponse',
    ];

    it.each(expectedSchemas)('should define %s schema', (schema) => {
      expect(swaggerDocument.components.schemas).toHaveProperty(schema);
    });

    it('QueryRequest should require question field', () => {
      const qr = swaggerDocument.components.schemas.QueryRequest;
      expect(qr.required).toContain('question');
      expect(qr.properties.question.type).toBe('string');
    });
  });
});
