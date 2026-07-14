import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.join(process.cwd(), "dist", "client");
const files: string[] = [];
async function walk(directory: string) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (entry.isFile()) files.push(full);
  }
}
await walk(root);
for (const file of files) {
  const content = await readFile(file);
  if (content.includes(Buffer.from("erda-dashscope-index"))) throw new Error(`DashScope index leaked into client asset: ${path.relative(root, file)}`);
}
console.log(JSON.stringify({ clientFilesChecked: files.length, dashscopeIndexMarkers: 0 }));
