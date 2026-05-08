import express from "express";
import categories from "../data/seedCategories.json" with { type: "json" };

export const categoriesRouter = express.Router();

categoriesRouter.get("/", (_req, res) => {
  res.json(categories);
});
