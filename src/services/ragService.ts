import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/config';
import { splitDocuments } from '../utils/chunking';
import { ensureCollection, qdrantClient } from '../utils/qdrant';

const embeddings = new OpenAIEmbeddings({
  apiKey: config.openai.apiKey,
  model: config.openai.embeddingModel,
});

/**
 * Loads a PDF, splits it into chunks, assigns UUIDs, and persists
 * the embeddings in the Qdrant collection.
 */
export async function ingestPdf(filePath: string): Promise<{ chunks: number }> {
  const loader = new PDFLoader(filePath);
  const docs = await loader.load();

  const chunks = await splitDocuments(docs);

  // Store UUIDs in metadata for traceability — Qdrant point IDs
  // are managed internally by the LangChain adapter.
  const chunksWithMetadata = chunks.map((chunk, index) => ({
    ...chunk,
    metadata: {
      ...chunk.metadata,
      chunkId: uuidv4(),
      chunkIndex: index,
    },
  }));

  // Guarantee the collection exists before any write
  await ensureCollection(config.qdrant.collectionName);

  const vectorStore = new QdrantVectorStore(embeddings, {
    client: qdrantClient,
    collectionName: config.qdrant.collectionName,
  });

  await vectorStore.addDocuments(chunksWithMetadata);

  return { chunks: chunksWithMetadata.length };
}

/**
 * Builds the LLM prompt with the retrieved context and streams each
 * token back via the onToken callback.
 */
export async function generateStreamingResponse(
  question: string,
  context: string,
  onToken: (token: string) => void,
): Promise<void> {
  const model = new ChatOpenAI({
    apiKey: config.openai.apiKey,
    model: config.openai.chatModel,
    streaming: true,
  });

  const prompt = `Use o contexto abaixo para responder à pergunta do usuário de forma clara e objetiva.

Contexto:
${context}

Pergunta: ${question}

Resposta:`;

  const stream = await model.stream(prompt);

  for await (const chunk of stream) {
    const token = chunk.content;
    if (typeof token === 'string' && token) {
      onToken(token);
    }
  }
}
