import { OpenAIEmbeddings } from '@langchain/openai';
import { config } from '../../config/config';
import { QdrantClientFactory } from './infrastructure/persistence/qdrant/QdrantClientFactory';
import { QdrantVectorRepository } from './infrastructure/persistence/qdrant/QdrantVectorRepository';
import { QdrantVectorRepositoryRegistry } from './infrastructure/persistence/qdrant/QdrantVectorRepositoryRegistry';
import { LangChainLlmAdapter } from './infrastructure/adapters/LangChainLlmAdapter';
import { LangChainPdfLoaderAdapter } from './infrastructure/adapters/LangChainPdfLoaderAdapter';
import { LangChainChunkingAdapter } from './infrastructure/adapters/LangChainChunkingAdapter';
import { LlmQueryRouterAdapter } from './infrastructure/adapters/LlmQueryRouterAdapter';
import { RRFRerankerAdapter } from './infrastructure/adapters/RRFRerankerAdapter';
import { IngestPdfUseCase } from './application/use-cases/IngestPdfUseCase';
import { QueryDocumentsUseCase } from './application/use-cases/QueryDocumentsUseCase';
import { RoutedQueryUseCase } from './application/use-cases/RoutedQueryUseCase';
import { GetApiStatusUseCase } from './application/use-cases/GetApiStatusUseCase';
import { GetReadinessUseCase } from './application/use-cases/GetReadinessUseCase';
import { GetQdrantInfoUseCase } from './application/use-cases/GetQdrantInfoUseCase';
import { IngestController } from './infrastructure/http/controllers/IngestController';
import { QueryController } from './infrastructure/http/controllers/QueryController';
import { HealthController } from './infrastructure/http/controllers/HealthController';
import { createRagRoutes } from './infrastructure/http/routes/ragRoutes';
import { createHealthRoutes } from './infrastructure/http/routes/healthRoutes';
import { IVectorRepository } from './domain/repositories/IVectorRepository';

// --- Infrastructure ---

const qdrantClient = QdrantClientFactory.create({
  url: config.qdrant.url,
  apiKey: config.qdrant.apiKey,
});

const embeddings = new OpenAIEmbeddings({
  apiKey: config.openai.apiKey,
  model: config.openai.embeddingModel,
});

// Build one QdrantVectorRepository per collection
const repositoryMap = new Map<string, IVectorRepository>();
for (const col of config.qdrant.collections) {
  repositoryMap.set(
    col.name,
    new QdrantVectorRepository(qdrantClient, embeddings, {
      collectionName: col.name,
      qdrantUrl: config.qdrant.url,
      embeddingModel: config.openai.embeddingModel,
    }),
  );
}

const registry = new QdrantVectorRepositoryRegistry(repositoryMap);

const llmService = new LangChainLlmAdapter(
  config.openai.apiKey,
  config.openai.chatModel,
);

const pdfLoader = new LangChainPdfLoaderAdapter();

const chunkingService = new LangChainChunkingAdapter({
  chunkSize: config.chunking.chunkSize,
  chunkOverlap: config.chunking.chunkOverlap,
});

const queryRouter = new LlmQueryRouterAdapter(
  config.openai.apiKey,
  config.openai.chatModel,
);

const reranker = new RRFRerankerAdapter();

// --- Use Cases ---

const ingestPdfUseCase = new IngestPdfUseCase(
  pdfLoader,
  chunkingService,
  registry,
);

const queryDocumentsUseCase = new QueryDocumentsUseCase(
  repositoryMap.values().next().value!,
  llmService,
);

const routedQueryUseCase = new RoutedQueryUseCase(
  registry,
  queryRouter,
  reranker,
  llmService,
);

const getApiStatusUseCase = new GetApiStatusUseCase(registry);
const getReadinessUseCase = new GetReadinessUseCase(registry);
const getQdrantInfoUseCase = new GetQdrantInfoUseCase(registry);

// --- Controllers ---

const collectionInfos = config.qdrant.collections.map((c) => ({
  name: c.name,
  description: c.description,
}));

const ingestController = new IngestController(
  ingestPdfUseCase,
  registry.getCollectionNames(),
);

const queryController = new QueryController(
  routedQueryUseCase,
  getQdrantInfoUseCase,
  {
    topK: config.chunking.topK,
    embeddingModel: config.openai.embeddingModel,
    collections: collectionInfos,
  },
);

const healthController = new HealthController(
  getApiStatusUseCase,
  getReadinessUseCase,
  config.nodeEnv,
);

// --- Routes ---

export const ragRoutes = createRagRoutes(ingestController, queryController);
export const healthRoutes = createHealthRoutes(healthController);
