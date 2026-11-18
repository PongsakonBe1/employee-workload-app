import { Router } from "express";
import { createResourceStatusHandler } from "../services/resourceStatusHandler.js";

export function createResourceStatusRouter(getFirebase) {
  const router = Router();
  router.get("/", createResourceStatusHandler(getFirebase));
  return router;
}
