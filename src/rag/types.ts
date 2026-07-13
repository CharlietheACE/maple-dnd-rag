export type Scalar = string | number | boolean;

export type SourceMetadata = {
  path: string;
  title: string;
  category: string;
  contentHash: string;
  syncVersion: string;
};

export type ScannedMarkdown = SourceMetadata & { absolutePath: string; content: string };

export type ChunkingConfig = {
  type: "static";
  maxChunkSizeTokens: number;
  chunkOverlapTokens: number;
};

export type ManifestEntry = SourceMetadata & {
  openaiFileId: string;
  vectorStoreFileId: string;
  indexedAt: string;
  chunking: ChunkingConfig;
};

export type RagManifest = { version: 1; entries: Record<string, ManifestEntry> };
