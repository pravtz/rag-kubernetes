import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from '@langchain/core/documents';
import { config } from '../config/config';

// Re-export legacy function for backward compatibility.
// New code should use LangChainChunkingAdapter via the IChunkingService port.
export async function splitDocuments(docs: Document[]): Promise<Document[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: config.chunking.chunkSize,
    chunkOverlap: config.chunking.chunkOverlap,
  });

  return splitter.splitDocuments(docs);
}
