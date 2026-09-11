import { Hono } from "hono";
import { healthRoute } from "@openstatus/health-hono";
import { exampleProbes } from "../probes.ts";

const app = new Hono();
app.route("/", healthRoute({ probes: exampleProbes() }));

Deno.serve(app.fetch);
