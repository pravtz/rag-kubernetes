import { OpenAIEmbeddings } from '@langchain/openai';
import { config } from '../../config/config';
import { QdrantClientFactory } from './infrastructure/persistence/qdrant/QdrantClientFactory';
import { QdrantVectorRepository } from './infrastructure/persistence/qdrant/QdrantVectorRepository';
import { LangChainLlmAdapter } from './infrastructure/adapters/LangChainLlmAdapter';
import { LangChainPdfLoaderAdapter } from './infrastructure/adapters/LangChainPdfLoaderAdapter';
import { LangChainChunkingAdapter } from './infrastructure/adapters/LangChainChunkingAdapter';
import { IngestPdfUseCase } from './application/use-cases/IngestPdfUseCase';
import { QueryDocumentsUseCase } from './application/use-cases/QueryDocumentsUseCase';
import { GetApiStatusUseCase } from './application/use-cases/GetApiStatusUseCase';
import { GetReadinessUseCase } from './application/use-cases/GetReadinessUseCase';
import { IngestController } from './infrastructure/http/controllers/IngestController';
import { QueryController } from './infrastructure/http/controllers/QueryController';
import { createRagRoutes } from './infrastructure/http/routes/ragRoutes';
import { HealthController } from '../../shared/infrastructure/http/controllers/HealthController';
import { createHealthRoutes } from '../../shared/infrastructure/http/routes/healthRoutes';

// --- Infrastructure ---

const qdrantClient = QdrantClientFactory.create({
  url: config.qdrant.url,
  apiKey: config.qdrant.apiKey,
});

const embeddings = new OpenAIEmbeddings({
  apiKey: config.openai.apiKey,
  model: config.openai.embeddingModel,
});

const vectorRepository = new QdrantVectorRepository(qdrantClient, embeddings, {
  collectionName: config.qdrant.collectionName,
  qdrantUrl: config.qdrant.url,
  embeddingModel: config.openai.embeddingModel,
});

const llmService = new LangChainLlmAdapter(
  config.openai.apiKey,
  config.openai.chatModel,
);

const pdfLoader = new LangChainPdfLoaderAdapter();

const chunkingService = new LangChainChunkingAdapter({
  chunkSize: config.chunking.chunkSize,
  chunkOverlap: config.chunking.chunkOverlap,
});

// --- Use Cases ---

const ingestPdfUseCase = new IngestPdfUseCase(
  pdfLoader,
  chunkingService,
  vectorRepository,
);

const queryDocumentsUseCase = new QueryDocumentsUseCase(
  vectorRepository,
  llmService,
);

const getApiStatusUseCase = new GetApiStatusUseCase(vectorRepository);
const getReadinessUseCase = new GetReadinessUseCase(vectorRepository);

// --- Controllers ---

const ingestController = new IngestController(ingestPdfUseCase);

const queryController = new QueryController(
  queryDocumentsUseCase,
  vectorRepository,
  {
    topK: config.chunking.topK,
    embeddingModel: config.openai.embeddingModel,
    collectionName: config.qdrant.collectionName,
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
