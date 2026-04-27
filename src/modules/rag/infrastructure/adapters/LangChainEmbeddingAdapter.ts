import { OpenAIEmbeddings } from '@langchain/openai';
import { IEmbeddingService } from '../../application/ports/IEmbeddingService';

export class LangChainEmbeddingAdapter implements IEmbeddingService {
  private readonly embeddings: OpenAIEmbeddings;

  constructor(apiKey: string, model: string) {
    this.embeddings = new OpenAIEmbeddings({ apiKey, model });
  }

  async embed(text: string): Promise<number[]> {
    return this.embeddings.embedQuery(text);
  }
}
