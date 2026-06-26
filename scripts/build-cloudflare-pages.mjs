import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const outDir = join(root, ".cloudflare-pages");

const files = [
  "index.html",
  "admin.html",
  "styles.css",
  "config.js",
  "_redirects",
  "_headers",
];

const directories = ["assets", "data", "scripts"];

await rm(outDir, { force: true, recursive: true });
await mkdir(outDir, { recursive: true });

for (const file of files) {
  await cp(join(root, file), join(outDir, file));
}

for (const directory of directories) {
  await cp(join(root, directory), join(outDir, directory), { recursive: true });
}
