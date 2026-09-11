import { versionedFiles } from "./versions.ts";

const version = Deno.args[0];
if (version == null || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error("Usage: deno task update-versions <x.y.z>");
  Deno.exit(1);
}

for (const file of await versionedFiles()) {
  const text = await Deno.readTextFile(file.path);
  const updated = text
    .replace(/"version":\s*"[^"]+"/, `"version": "${version}"`)
    .replace(
      /"@openstatus\/health":\s*"\^[^"]+"/g,
      `"@openstatus/health": "^${version}"`,
    );
  await Deno.writeTextFile(file.path, updated);
  console.log(`${file.path}: ${file.version} -> ${version}`);
}
