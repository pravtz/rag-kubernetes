/** Represents a loaded document page before chunking. */
export interface RawDocument {
  pageContent: string;
  metadata: Record<string, unknown>;
}
