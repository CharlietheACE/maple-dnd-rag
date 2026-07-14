import path from "node:path";
import { readManifest, writeManifestAtomic } from "./manifest.ts";
import type { OpenAITransport } from "./openai-transport.ts";
import { scanErdaBook } from "./scan.ts";
import type { ChunkingConfig, ManifestEntry, RagManifest, ScannedMarkdown } from "./types.ts";

export const DEFAULT_CHUNKING: ChunkingConfig = { type: "static", maxChunkSizeTokens: 800, chunkOverlapTokens: 400 };
export type SyncAction = { type: "add" | "replace" | "delete"; path: string };

export function planSync(sources: ScannedMarkdown[], manifest: RagManifest): SyncAction[] {
  const current = new Map(sources.map((source) => [source.path, source]));
  const actions: SyncAction[] = [];
  for (const source of sources) {
    const previous = manifest.entries[source.path];
    if (!previous) actions.push({ type: "add", path: source.path });
    else if (previous.contentHash !== source.contentHash) actions.push({ type: "replace", path: source.path });
  }
  for (const oldPath of Object.keys(manifest.entries)) if (!current.has(oldPath)) actions.push({ type: "delete", path: oldPath });
  return actions.sort((a, b) => a.path.localeCompare(b.path));
}

export async function syncErdaBook(options: { root?: string; manifestPath?: string; vectorStoreId: string; transport: OpenAITransport; dryRun?: boolean; syncVersion?: string; now?: () => Date; chunking?: ChunkingConfig }) {
  const root = options.root ?? process.cwd();
  const manifestPath = options.manifestPath ?? path.join(root, ".rag", "manifest.json");
  const syncVersion = options.syncVersion ?? new Date().toISOString();
  const sources = await scanErdaBook(root, syncVersion);
  const oldManifest = await readManifest(manifestPath);
  const actions = planSync(sources, oldManifest);
  if (options.dryRun) return { actions, manifest: oldManifest };
  const next: RagManifest = structuredClone(oldManifest);
  const byPath = new Map(sources.map((source) => [source.path, source]));
  const chunking = options.chunking ?? DEFAULT_CHUNKING;
  for (const action of actions) {
    const previous = oldManifest.entries[action.path];
    if (action.type === "delete") {
      await options.transport.detach(options.vectorStoreId, previous.vectorStoreFileId);
      await options.transport.deleteFile(previous.openaiFileId);
      delete next.entries[action.path];
      continue;
    }
    const source = byPath.get(action.path)!;
    const uploaded = await options.transport.upload(path.basename(source.path), source.content);
    let attached: { id: string };
    try {
      attached = await options.transport.attach(options.vectorStoreId, uploaded.id, source, chunking);
      await options.transport.waitUntilIndexed(options.vectorStoreId, attached.id);
    } catch (error) {
      await options.transport.deleteFile(uploaded.id).catch(() => undefined);
      throw error;
    }
    const entry: ManifestEntry = { path: source.path, title: source.title, category: source.category, contentHash: source.contentHash, syncVersion, openaiFileId: uploaded.id, vectorStoreFileId: attached.id, indexedAt: (options.now ?? (() => new Date()))().toISOString(), chunking };
    next.entries[action.path] = entry;
    if (previous) {
      await options.transport.detach(options.vectorStoreId, previous.vectorStoreFileId);
      await options.transport.deleteFile(previous.openaiFileId);
    }
  }
  await writeManifestAtomic(manifestPath, next);
  return { actions, manifest: next };
}
