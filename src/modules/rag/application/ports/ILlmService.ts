export interface LlmMetrics {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  durationMs: number;
  tokensPerSecond: number;
  model: string;
}

export interface ILlmService {
  streamResponse(
    question: string,
    context: string,
    onToken: (token: string) => void,
  ): Promise<LlmMetrics>;
}
