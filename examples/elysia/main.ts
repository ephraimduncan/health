import { Elysia } from "elysia";
import { health } from "@openstatus/health-elysia";
import { exampleProbes } from "../probes.ts";

const app = new Elysia().use(health({ probes: exampleProbes() }));

Deno.serve(app.fetch);
