export interface DocumentIngestedEvent {
  documentId: string;
  filename: string;
  chunksCount: number;
  timestamp: Date;
}

export function createDocumentIngestedEvent(
  documentId: string,
  filename: string,
  chunksCount: number,
): DocumentIngestedEvent {
  return {
    documentId,
    filename,
    chunksCount,
    timestamp: new Date(),
  };
}
