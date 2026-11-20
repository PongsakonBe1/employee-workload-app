import { Router } from "express";
import cors from "cors";
import { createResourceStatusHandler } from "../resource-status/resourceStatusHandler.js";

const productionOrigin = "https://labboy-workload-app.web.app";
const productionProject = "labboy-workload-app";

export function createResourceStatusRouter(getFirebase) {
  const router = Router();
  const resourceStatus = createResourceStatusHandler(async () => {
    const app = await getFirebase();
    const project = app.options.projectId ?? app.options.credential?.projectId;
    if (project !== productionProject) throw Error("Unexpected Firebase project for Resource Status");
    return app;
  });

  router.use((req, res, next) => {
    res.vary("Origin");
    res.set("Cache-Control", "private, no-store");
    const origin = req.get("Origin");
    if (origin && origin !== productionOrigin) return res.sendStatus(403);
    if (req.method !== "GET" && req.method !== "OPTIONS") return res.sendStatus(404);
    next();
  });
  router.use(cors({ origin: productionOrigin, methods: ["GET", "OPTIONS"], allowedHeaders: ["Authorization"] }));
  router.get("/", resourceStatus);
  router.close = resourceStatus.close;
  return router;
}
