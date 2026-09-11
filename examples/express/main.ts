import express from "express";
import { healthRouter } from "@openstatus/health-express";
import { exampleProbes } from "../probes.ts";

const app = express();
app.use(healthRouter({ probes: exampleProbes() }));
app.listen(3000);
