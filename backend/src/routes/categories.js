import express from "express";
import categories from "../data/seedCategories.json" with { type: "json" };
import { requireAuth } from "../middleware/auth.js";

export const categoriesRouter = express.Router();

categoriesRouter.use(requireAuth);

categoriesRouter.get("/", (_req, res) => {
  res.json(categories);
});
