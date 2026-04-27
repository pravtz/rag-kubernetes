import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { IPdfLoader } from '../../application/ports/IPdfLoader';
import { RawDocument } from '../../domain/types';

export class LangChainPdfLoaderAdapter implements IPdfLoader {
  async load(filePath: string): Promise<RawDocument[]> {
    const loader = new PDFLoader(filePath);
    const docs = await loader.load();

    return docs.map((doc) => ({
      pageContent: doc.pageContent,
      metadata: doc.metadata as Record<string, unknown>,
    }));
  }
}
