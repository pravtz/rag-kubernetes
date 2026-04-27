import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { config } from '../config/config';
import { qdrantClient } from '../utils/qdrant';

const embeddings = new OpenAIEmbeddings({
  apiKey: config.openai.apiKey,
  model: config.openai.embeddingModel,
});

/**
 * Searches the vector store for the topK chunks most similar to the
 * question and returns them concatenated as a single context string.
 */
export async function retrieveContext(question: string): Promise<string> {
  const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
    client: qdrantClient,
    collectionName: config.qdrant.collectionName,
  });

  const results = await vectorStore.similaritySearch(question, config.chunking.topK);

  return results.map((doc) => doc.pageContent).join('\n\n---\n\n');
}
