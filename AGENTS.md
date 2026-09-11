# @openstatus/health — development guidelines

## Layout

- `packages/<name>/` — one npm/JSR package per concern. `health` is the
  zero-dependency core; `hono`, `elysia`, `express`, `next` are server
  adapters; `tinybird`, `drizzle`, `turso`, `turso-serverless`, `supabase`,
  `unkey` are probes; `fly`, `koyeb`, `railway`, `vercel`, `cloudflare` render
  hosting metadata under `server` via the `extend` hook.
- Each package has `deno.json` (`exports: ./src/mod.ts`), `package.json`
  (`exports -> dist/`, `sideEffects: false`), `tsdown.config.ts`, `README.md`
  and `src/` with `mod.ts`, implementation files and one `*.test.ts` per file.
- `examples/` are type-checked in CI and never published.
- `scripts/` hold workspace maintenance scripts.

## Adding a package

1. Create `packages/<name>` with the files above.
2. Add it to `workspace` in the root `deno.json`.
3. Add its allowed dependencies to `scripts/check_treeshake.ts`.
4. Add a row to the root `README.md` package table.

## Conventions

- Deno only: `deno task check`, `deno task test`, `deno task build`,
  `deno task test:node`, `deno task check:treeshake`.
- Strict TypeScript. Never use `any` or `unknown`; spell out the union you
  mean or use a structural interface.
- Explicit return types on every exported function (JSR rejects slow types).
- No comments or JSDoc unless they explain something the code cannot.
- Client libraries are imported with `import type` only. Runtime imports are
  limited to what is actually called.
- No top-level side effects in any `src/*.ts`.
- Tests use `node:test` and `node:assert/strict` so they run unchanged under
  `deno test` and `node --test`.
- All packages share one version; `deno task check:versions` enforces it and
  `deno task update-versions x.y.z` bumps it.

## Releasing

Publishing is manual; see `RELEASING.md`.
