import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { ScannedMarkdown } from "./types.ts";

function posix(relativePath: string) { return relativePath.split(path.sep).join("/"); }

function titleOf(content: string, relativePath: string) {
  const heading = content.match(/^#\s+(.+)\s*$/m)?.[1]?.trim();
  return heading || path.basename(relativePath, path.extname(relativePath));
}

function categoryOf(relativePath: string) {
  const parts = posix(relativePath).split("/");
  return parts.length > 2 ? parts[1] : "root";
}

export async function scanErdaBook(root = process.cwd(), syncVersion = new Date().toISOString()): Promise<ScannedMarkdown[]> {
  const bookRoot = path.join(root, "ErdaBook");
  const files: string[] = [];
  async function walk(directory: string) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".md") files.push(full);
    }
  }
  await walk(bookRoot);
  return Promise.all(files.map(async (absolutePath) => {
    const bytes = await readFile(absolutePath);
    const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const relativePath = posix(path.relative(root, absolutePath));
    return {
      absolutePath,
      content,
      path: relativePath,
      title: titleOf(content, relativePath),
      category: categoryOf(relativePath),
      contentHash: createHash("sha256").update(bytes).digest("hex"),
      syncVersion,
    };
  }));
}
