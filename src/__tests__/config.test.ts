describe('Config module', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...process.env,
      OPENAI_API_KEY: 'test-key',
      QDRANT_URL: 'http://localhost:6333',
      QDRANT_COLLECTION_NAME: 'test-collection',
    };
    // Jest sets NODE_ENV to 'test' by default
    delete process.env.NODE_ENV;
    delete process.env.PORT;
    delete process.env.OPENAI_CHAT_MODEL;
    delete process.env.OPENAI_EMBEDDING_MODEL;
    delete process.env.CHUNK_SIZE;
    delete process.env.CHUNK_OVERLAP;
    delete process.env.TOP_K;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should load default values for optional env vars', () => {
    const module = require('../config/config');
    const { config } = module;

    expect(config.port).toBe(3000);
    // Jest env is 'test' by default
    expect(['development', 'test']).toContain(config.nodeEnv);
    expect(config.openai.chatModel).toBe('gpt-4o-mini');
    expect(config.openai.embeddingModel).toBe('text-embedding-3-small');
    expect(config.chunking.chunkSize).toBe(1000);
    expect(config.chunking.chunkOverlap).toBe(200);
    expect(config.chunking.topK).toBe(4);
  });

  it('should load custom env values when provided', () => {
    process.env.PORT = '8000';
    process.env.NODE_ENV = 'production';
    process.env.CHUNK_SIZE = '2000';
    process.env.TOP_K = '10';

    const module = require('../config/config');
    const { config } = module;

    expect(config.port).toBe(8000);
    expect(config.nodeEnv).toBe('production');
    expect(config.chunking.chunkSize).toBe(2000);
    expect(config.chunking.topK).toBe(10);
  });

  it('should throw error when required env vars are missing', () => {
    delete process.env.OPENAI_API_KEY;

    expect(() => {
      jest.resetModules();
      require('../config/config');
    }).toThrow('Missing required environment variable: OPENAI_API_KEY');
  });

  it('should expose required config properties', () => {
    const module = require('../config/config');
    const { config } = module;

    expect(config).toHaveProperty('port');
    expect(config).toHaveProperty('nodeEnv');
    expect(config).toHaveProperty('openai');
    expect(config).toHaveProperty('qdrant');
    expect(config).toHaveProperty('chunking');
  });

  it('should load OpenAI config correctly', () => {
    const module = require('../config/config');
    const { config } = module;

    expect(config.openai.apiKey).toBe('test-key');
    expect(config.openai.chatModel).toBeTruthy();
    expect(config.openai.embeddingModel).toBeTruthy();
  });

  it('should load Qdrant config correctly', () => {
    const module = require('../config/config');
    const { config } = module;

    expect(config.qdrant.url).toBe('http://localhost:6333');
    expect(config.qdrant.collectionName).toBe('test-collection');
    expect(config.qdrant.collections).toEqual([
      { name: 'test-collection', description: '' },
    ]);
  });

  it('should parse QDRANT_COLLECTIONS as CSV', () => {
    process.env.QDRANT_COLLECTIONS = 'docs,normas,gerais';
    process.env.QDRANT_COLLECTION_DESCRIPTIONS =
      'Documentos,Normas técnicas,Docs gerais';
    delete process.env.QDRANT_COLLECTION_NAME;

    const module = require('../config/config');
    const { config } = module;

    expect(config.qdrant.collections).toEqual([
      { name: 'docs', description: 'Documentos' },
      { name: 'normas', description: 'Normas técnicas' },
      { name: 'gerais', description: 'Docs gerais' },
    ]);
  });

  it('should throw when neither QDRANT_COLLECTIONS nor QDRANT_COLLECTION_NAME is set', () => {
    delete process.env.QDRANT_COLLECTION_NAME;
    delete process.env.QDRANT_COLLECTIONS;

    expect(() => {
      jest.resetModules();
      require('../config/config');
    }).toThrow(
      'Missing required environment variable: QDRANT_COLLECTIONS or QDRANT_COLLECTION_NAME',
    );
  });
});
