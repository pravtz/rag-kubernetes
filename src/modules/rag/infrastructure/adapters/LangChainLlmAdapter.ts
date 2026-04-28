import { ChatOpenAI } from '@langchain/openai';
import { ILlmService, LlmMetrics } from '../../application/ports/ILlmService';

export class LangChainLlmAdapter implements ILlmService {
  private readonly model: ChatOpenAI;
  private readonly modelName: string;

  constructor(apiKey: string, chatModel: string) {
    this.modelName = chatModel;
    this.model = new ChatOpenAI({
      apiKey,
      model: chatModel,
      streaming: true,
      streamUsage: true,
    });
  }

  async streamResponse(
    question: string,
    context: string,
    onToken: (token: string) => void,
  ): Promise<LlmMetrics> {
    const startTime = Date.now();
    let inputTokens = 0;
    let outputTokens = 0;
    let tokenCount = 0;

    const prompt = `Use o contexto abaixo para responder à pergunta do usuário de forma clara e objetiva.

Contexto:
${context}

Pergunta: ${question}

Resposta:`;

    const stream = await this.model.stream(prompt);

    for await (const chunk of stream) {
      const token = chunk.content;
      if (typeof token === 'string' && token) {
        tokenCount++;
        onToken(token);
      }

      if (chunk.usage_metadata) {
        inputTokens = chunk.usage_metadata.input_tokens;
        outputTokens = chunk.usage_metadata.output_tokens;
      }
    }

    const durationMs = Date.now() - startTime;
    // Fall back to counted tokens if usage_metadata was not provided
    const finalOutputTokens = outputTokens || tokenCount;
    const totalTokens = inputTokens + finalOutputTokens;

    return {
      inputTokens,
      outputTokens: finalOutputTokens,
      totalTokens,
      durationMs,
      tokensPerSecond:
        durationMs > 0
          ? parseFloat((finalOutputTokens / (durationMs / 1000)).toFixed(2))
          : 0,
      model: this.modelName,
    };
  }
}
