import { createHash } from "node:crypto";
import type { ScannedMarkdown } from "./types.ts";

export const DEFAULT_DASHSCOPE_CHUNKING = Object.freeze({ strategy: "markdown-heading-aware" as const, targetCharacters: 1200, overlapCharacters: 200 });
export type HeadingChunkingConfig = typeof DEFAULT_DASHSCOPE_CHUNKING;
export type MarkdownChunk = Pick<ScannedMarkdown, "path" | "title" | "category" | "contentHash"> & { chunkId: string; text: string };

type Section = { headings: string[]; body: string };

function sectionsOf(document: ScannedMarkdown): Section[] {
  const lines = document.content.replace(/\r\n?/g, "\n").split("\n");
  const sections: Section[] = [];
  const headings: string[] = [];
  let body: string[] = [];
  const flush = () => {
    const text = body.join("\n").trim();
    if (text || headings.length) sections.push({ headings: headings.length ? [...headings] : [`# ${document.title}`], body: text });
    body = [];
  };
  for (const line of lines) {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!match) { body.push(line); continue; }
    flush();
    const level = match[1].length;
    headings.splice(level - 1);
    headings[level - 1] = `${match[1]} ${match[2]}`;
  }
  flush();
  return sections.length ? sections : [{ headings: [`# ${document.title}`], body: "" }];
}

function splitSection(section: Section, target: number, overlap: number): string[] {
  const prefix = section.headings.join("\n");
  const body = section.body.trim();
  if (!body) return [prefix];
  const available = Math.max(1, target - prefix.length - 2);
  if (body.length <= available) return [`${prefix}\n\n${body}`];
  const chunks: string[] = [];
  let start = 0;
  while (start < body.length) {
    let end = Math.min(body.length, start + available);
    if (end < body.length) {
      const boundary = body.lastIndexOf("\n", end);
      if (boundary > start + Math.floor(available * 0.6)) end = boundary;
    }
    chunks.push(`${prefix}\n\n${body.slice(start, end).trim()}`);
    if (end >= body.length) break;
    const next = Math.max(0, end - overlap);
    start = next > start ? next : end;
  }
  return chunks;
}

export function chunkMarkdown(document: ScannedMarkdown, config: HeadingChunkingConfig = DEFAULT_DASHSCOPE_CHUNKING): MarkdownChunk[] {
  if (config.targetCharacters < 100 || config.overlapCharacters < 0 || config.overlapCharacters >= config.targetCharacters) {
    throw new RangeError("Invalid heading-aware chunking configuration");
  }
  const texts = sectionsOf(document).flatMap((section) => splitSection(section, config.targetCharacters, config.overlapCharacters));
  return texts.map((text, index) => ({
    path: document.path,
    title: document.title,
    category: document.category,
    contentHash: document.contentHash,
    chunkId: createHash("sha256").update(`${document.path}\0${document.contentHash}\0${index}\0${text}`).digest("hex"),
    text,
  }));
}

export function chunkDocuments(documents: ScannedMarkdown[], config: HeadingChunkingConfig = DEFAULT_DASHSCOPE_CHUNKING): MarkdownChunk[] {
  return [...documents].sort((a, b) => a.path.localeCompare(b.path)).flatMap((document) => chunkMarkdown(document, config));
}
