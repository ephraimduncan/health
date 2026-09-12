# Releasing

All packages share one version and are released together. Pushing a version
tag (`0.2.0`, `0.2.0-beta.1`) runs `.github/workflows/release.yaml`, which
verifies the tree and publishes every workspace member to JSR and npm. On
every other push CI only proves that a release would succeed
(`deno publish --dry-run` and `npm pack --dry-run`).

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

5. Commit, tag and push. The tag must equal the manifest version; the
   workflow refuses to publish otherwise.

   ```sh
   git commit -am "Release 0.2.0"
   git tag 0.2.0
   git push origin main 0.2.0
   ```

6. Watch the `release` workflow. It runs three jobs:

   - `verify`: `deno task check:versions <tag>`, `deno task test-all`,
     `deno publish --dry-run` and `npm pack --dry-run` for every package.
   - `jsr`: `deno publish` from the workspace root (every member at once).
     Versions that are already on JSR are skipped.
   - `npm`: `deno task build`, then `npm publish --provenance` for
     `packages/health` first and every other package after it (they declare
     it as a peer dependency at `^<version>`). Versions that are already on
     npm are skipped, so a failed run can be re-run from the Actions tab.

7. Create a GitHub release from the tag with the `CHANGES.md` entry.

## One-time setup

Both registries authenticate the workflow with GitHub OIDC, so no long-lived
JSR token is needed.

- JSR: link every `@openstatus/health*` package to `openstatusHQ/health` in
  its settings on jsr.io (Settings → GitHub repository). `deno publish` fails
  with an authentication error for packages that are not linked.
- npm, pick one:
  - Trusted publishing: on npmjs.com add a trusted publisher to every
    package (repository `openstatusHQ/health`, workflow `release.yaml`,
    no environment). Nothing else to configure.
  - Token: create a granular access token with publish rights on the
    `@openstatus` scope and 2FA bypass, and store it as the `NPM_TOKEN`
    repository secret. The workflow uses it when present and falls back to
    trusted publishing when it is empty.

## Publishing by hand

If the workflow cannot run, the same steps work locally:

```sh
deno publish
deno task build
(cd packages/health && npm publish --access public --ignore-scripts)
for dir in packages/*/; do
  [ "$dir" = packages/health/ ] && continue
  (cd "$dir" && npm publish --access public --ignore-scripts)
done
```

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
