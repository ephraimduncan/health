import { dirname, join } from "@std/path";

interface Manifest {
  version?: string;
  peerDependencies?: Record<string, string>;
}

export interface VersionedFile {
  readonly path: string;
  readonly version: string;
  readonly corePeerRange?: string;
}

const root: string = dirname(import.meta.dirname!);

export async function workspaceMembers(): Promise<string[]> {
  const text = await Deno.readTextFile(join(root, "deno.json"));
  const data: { workspace: string[] } = JSON.parse(text);
  return data.workspace;
}

export async function versionedFiles(): Promise<VersionedFile[]> {
  const files: VersionedFile[] = [];
  for (const member of await workspaceMembers()) {
    for (const name of ["deno.json", "package.json"]) {
      const path = join(root, member, name);
      let text: string;
      try {
        text = await Deno.readTextFile(path);
      } catch (e) {
        if (e instanceof Deno.errors.NotFound) continue;
        throw e;
      }
      const data: Manifest = JSON.parse(text);
      if (data.version == null) continue;
      files.push({
        path,
        version: data.version,
        corePeerRange: data.peerDependencies?.["@openstatus/health"],
      });
    }
  }
  return files;
}
