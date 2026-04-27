import { ChatOpenAI } from '@langchain/openai';
import { ILlmService } from '../../application/ports/ILlmService';

export class LangChainLlmAdapter implements ILlmService {
  private readonly model: ChatOpenAI;

  constructor(apiKey: string, chatModel: string) {
    this.model = new ChatOpenAI({
      apiKey,
      model: chatModel,
      streaming: true,
    });
  }

  async streamResponse(
    question: string,
    context: string,
    onToken: (token: string) => void,
  ): Promise<void> {
    const prompt = `Use o contexto abaixo para responder à pergunta do usuário de forma clara e objetiva.

Contexto:
${context}

Pergunta: ${question}

Resposta:`;

    const stream = await this.model.stream(prompt);

    for await (const chunk of stream) {
      const token = chunk.content;
      if (typeof token === 'string' && token) {
        onToken(token);
      }
    }
  }
}
