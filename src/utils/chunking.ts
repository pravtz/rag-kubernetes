import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from '@langchain/core/documents';
import { config } from '../config/config';

/**
 * Splits a list of LangChain Documents into smaller chunks
 * using the chunk size and overlap defined in config.
 */
export async function splitDocuments(docs: Document[]): Promise<Document[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: config.chunking.chunkSize,
    chunkOverlap: config.chunking.chunkOverlap,
  });

  return splitter.splitDocuments(docs);
}
