import { versionedFiles } from "./versions.ts";

const files = await versionedFiles();
const versions = new Set(files.map((f) => f.version));

if (versions.size > 1) {
  console.error("Versions are inconsistent:");
  for (const file of files) console.error(`  ${file.path}: ${file.version}`);
  Deno.exit(1);
}
console.log(`All ${files.length} manifests are at ${[...versions][0]}`);
