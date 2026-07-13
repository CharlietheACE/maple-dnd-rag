import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { scanErdaBook } from "../src/rag/scan.ts";

const syncVersion = "2026-07-13.sites-sync-v1";
const sources = await scanErdaBook(process.cwd(), syncVersion);
const documents = sources.map((source) => ({ path: source.path, title: source.title, category: source.category, contentHash: source.contentHash, syncVersion: source.syncVersion, content: source.content }));
const output = `import type { EmbeddedDocument } from "../runtime-sync.ts";\nexport const EMBEDDED_ERDA_CORPUS: readonly EmbeddedDocument[] = ${JSON.stringify(documents)};\n`;
const target = path.join(process.cwd(), "src", "rag", "generated", "embedded-corpus.ts");
await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, output, "utf8");
console.log(JSON.stringify({ documents: documents.length, target: "src/rag/generated/embedded-corpus.ts" }));
