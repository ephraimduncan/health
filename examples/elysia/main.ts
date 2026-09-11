import { Elysia } from "elysia";
import { health } from "@openstatus/health-elysia";
import { cloudflareExtend } from "@openstatus/health-cloudflare";
import { exampleProbes } from "../probes.ts";

const app = new Elysia().use(health({
  probes: exampleProbes(),
  extend: cloudflareExtend({ request: (ctx) => ctx.request }),
}));

Deno.serve(app.fetch);
