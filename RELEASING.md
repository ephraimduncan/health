# Releasing

All packages share one version and are released together. Publishing is
manual; CI only proves that a release would succeed (`deno publish --dry-run`
and `npm pack --dry-run` run on every push).

## Checklist

1. Make sure `main` is green: `check`, `test-deno`, `test-node`, `treeshake`
   and `publish-dry-run`.
2. Bump every `deno.json` and `package.json` at once (this also rewrites the
   `@openstatus/health` peer range in the adapters and probes):

   ```sh
   deno task update-versions 0.2.0
   deno task check:versions
   ```

3. Add a `0.2.0` section to `CHANGES.md`.
4. Run the full suite locally:

   ```sh
   deno task test-all
   ```

5. Commit and tag:

   ```sh
   git commit -am "Release 0.2.0"
   git tag 0.2.0
   git push origin main 0.2.0
   ```

6. Publish to JSR from the workspace root (publishes every member):

   ```sh
   deno publish
   ```

7. Build and publish to npm, one package at a time. `deno task build` writes
   `dist/` for every member; `npm publish` only ships `dist/`, `README.md`
   and `package.json`.

   ```sh
   deno task build
   for dir in packages/*/; do
     (cd "$dir" && npm publish --access public --ignore-scripts)
   done
   ```

   Publish `packages/health` first if you run them by hand: the adapters and
   probes declare it as a peer dependency at `^<version>`.

8. Create a GitHub release from the tag with the `CHANGES.md` entry.

## Sanity checks before publishing

- `deno publish --dry-run` lists exactly `README.md`, `deno.json`,
  `package.json` and `src/*.ts` (no tests, no `fake-fetch.ts`, no
  `tsdown.config.ts`).
- `npm pack --dry-run` inside a package lists only `dist/` plus `README.md`
  and `package.json`.
- Install the tarballs into a scratch project and import them from both ESM
  and CJS:

  ```sh
  mkdir /tmp/smoke && cd /tmp/smoke && npm init -y
  npm i --ignore-scripts ../health/packages/*/openstatus-health-*.tgz
  node -e 'import("@openstatus/health").then((m) => console.log(Object.keys(m)))'
  node -e 'console.log(Object.keys(require("@openstatus/health")))'
  ```
