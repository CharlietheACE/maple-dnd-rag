import { ConfigurationError } from "../config/server-env.ts";
import { DEFAULT_DASHSCOPE_CHUNKING, type HeadingChunkingConfig, type MarkdownChunk } from "./chunker.ts";

export const DASHSCOPE_INDEX_SCHEMA = "erda-dashscope-index";
export const DASHSCOPE_INDEX_VERSION = 1;

export type DashScopeIndexDocument = { path: string; title: string; category: string; contentHash: string; chunkIds: string[] };
export type DashScopeIndexChunk = MarkdownChunk & { vector: number[] };
export type DashScopeIndex = {
  schema: typeof DASHSCOPE_INDEX_SCHEMA;
  version: typeof DASHSCOPE_INDEX_VERSION;
  chunking: HeadingChunkingConfig;
  model: string;
  dimensions: number;
  documents: DashScopeIndexDocument[];
  chunks: DashScopeIndexChunk[];
};

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }

export function createDashScopeIndex(options: { chunks: MarkdownChunk[]; vectors: number[][]; model: string; dimensions: number; chunking?: HeadingChunkingConfig }): DashScopeIndex {
  if (options.chunks.length !== options.vectors.length) throw new TypeError("Chunk/vector count mismatch");
  const chunks = options.chunks.map((chunk, index) => ({ ...chunk, vector: [...options.vectors[index]] }));
  const byPath = new Map<string, DashScopeIndexDocument>();
  for (const chunk of chunks) {
    const existing = byPath.get(chunk.path);
    if (existing) existing.chunkIds.push(chunk.chunkId);
    else byPath.set(chunk.path, { path: chunk.path, title: chunk.title, category: chunk.category, contentHash: chunk.contentHash, chunkIds: [chunk.chunkId] });
  }
  return validateDashScopeIndex({
    schema: DASHSCOPE_INDEX_SCHEMA,
    version: DASHSCOPE_INDEX_VERSION,
    chunking: options.chunking ?? DEFAULT_DASHSCOPE_CHUNKING,
    model: options.model,
    dimensions: options.dimensions,
    documents: [...byPath.values()],
    chunks,
  });
}

export function validateDashScopeIndex(value: unknown): DashScopeIndex {
  if (!isRecord(value) || value.schema !== DASHSCOPE_INDEX_SCHEMA || value.version !== DASHSCOPE_INDEX_VERSION) throw new ConfigurationError("DashScope index schema/version mismatch");
  if (!isRecord(value.chunking) || value.chunking.strategy !== DEFAULT_DASHSCOPE_CHUNKING.strategy || !Number.isInteger(value.chunking.targetCharacters) || !Number.isInteger(value.chunking.overlapCharacters)) throw new ConfigurationError("DashScope index chunking metadata is invalid");
  if (typeof value.model !== "string" || !value.model || !Number.isInteger(value.dimensions) || Number(value.dimensions) < 1) throw new ConfigurationError("DashScope index embedding metadata is invalid");
  if (!Array.isArray(value.documents) || !Array.isArray(value.chunks)) throw new ConfigurationError("DashScope index documents/chunks are invalid");
  const dimensions = Number(value.dimensions);
  const documents = value.documents.map((document) => {
    if (!isRecord(document) || typeof document.path !== "string" || !document.path.startsWith("ErdaBook/") || typeof document.title !== "string" || typeof document.category !== "string" || typeof document.contentHash !== "string" || !Array.isArray(document.chunkIds) || !document.chunkIds.every((id) => typeof id === "string")) throw new ConfigurationError("DashScope index document metadata is invalid");
    return document as DashScopeIndexDocument;
  });
  const chunks = value.chunks.map((chunk) => {
    if (!isRecord(chunk) || typeof chunk.chunkId !== "string" || typeof chunk.path !== "string" || !chunk.path.startsWith("ErdaBook/") || typeof chunk.title !== "string" || typeof chunk.category !== "string" || typeof chunk.contentHash !== "string" || typeof chunk.text !== "string" || !Array.isArray(chunk.vector) || chunk.vector.length !== dimensions || !chunk.vector.every((item) => typeof item === "number" && Number.isFinite(item))) throw new ConfigurationError("DashScope index chunk/vector is invalid");
    return chunk as DashScopeIndexChunk;
  });
  return { schema: DASHSCOPE_INDEX_SCHEMA, version: DASHSCOPE_INDEX_VERSION, chunking: value.chunking as HeadingChunkingConfig, model: value.model, dimensions, documents, chunks };
}
