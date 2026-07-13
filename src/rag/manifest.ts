import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RagManifest } from "./types.ts";

export const EMPTY_MANIFEST: RagManifest = { version: 1, entries: {} };

export async function readManifest(filePath: string): Promise<RagManifest> {
  try {
    const value = JSON.parse(await readFile(filePath, "utf8")) as RagManifest;
    if (value.version !== 1 || !value.entries) throw new Error("Unsupported RAG manifest");
    return value;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return structuredClone(EMPTY_MANIFEST);
    throw error;
  }
}

export async function writeManifestAtomic(filePath: string, manifest: RagManifest) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await rename(temporary, filePath);
}
