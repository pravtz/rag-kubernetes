export interface ILlmService {
  streamResponse(
    question: string,
    context: string,
    onToken: (token: string) => void,
  ): Promise<void>;
}
