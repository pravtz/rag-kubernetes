import { ChatOpenAI } from '@langchain/openai';
import {
  IQueryRouter,
  CollectionInfo,
} from '../../application/ports/IQueryRouter';
import { QueryIntent, CollectionTarget } from '../../domain/value-objects/QueryIntent';

export class LlmQueryRouterAdapter implements IQueryRouter {
  private readonly model: ChatOpenAI;

  constructor(apiKey: string, chatModel: string) {
    this.model = new ChatOpenAI({
      apiKey,
      model: chatModel,
      temperature: 0,
    });
  }

  async classify(
    question: string,
    collections: CollectionInfo[],
  ): Promise<QueryIntent> {
    const collectionList = collections
      .map((c) => `- "${c.name}": ${c.description || 'No description'}`)
      .join('\n');

    const prompt = `You are a query router. Given a user question and a list of document collections, decide which collections are relevant.

Collections:
${collectionList}

Question: ${question}

Respond ONLY with a JSON object in this format (no markdown, no explanation):
{"targets": [{"collectionName": "<name>", "confidence": <0.0-1.0>}]}

Include only collections with confidence > 0.3. If unsure, include all collections.`;

    try {
      const response = await this.model.invoke(prompt);
      const content =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

      const parsed = JSON.parse(content) as {
        targets: CollectionTarget[];
      };

      if (
        parsed.targets &&
        Array.isArray(parsed.targets) &&
        parsed.targets.length > 0
      ) {
        return QueryIntent.create(parsed.targets);
      }
    } catch {
      // Fallback: route to all collections
    }

    // Fallback: all collections with equal confidence
    const fallbackTargets: CollectionTarget[] = collections.map((c) => ({
      collectionName: c.name,
      confidence: 1.0 / collections.length,
    }));

    return QueryIntent.create(fallbackTargets);
  }
}
