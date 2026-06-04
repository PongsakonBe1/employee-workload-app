import express from "express";
import categories from "../data/seedCategories.json" with { type: "json" };
import { requireAuth } from "../middleware/auth.js";
import { WorkLog } from "../models/WorkLog.js";
import { buildWorkLogFilter } from "../services/workLogFilters.js";
import { parseDateOnly } from "../utils/fiscalYear.js";

export const workLogsRouter = express.Router();

function inferDutyGroup(mainDuty) {
  for (const group of categories.dutyGroups) {
    if (group.duties.includes(mainDuty)) {
      return group.key;
    }
  }
  return null;
}

function normalizePayload(body, user) {
  const date = parseDateOnly(body.date);
  const time = String(body.time || "").trim();

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new Error("Time must use HH:mm format");
  }

  const mainDuty = String(body.mainDuty || "").trim();
  if (!mainDuty) {
    throw new Error("Main duty is required");
  }

  return {
    date,
    time,
    employeeUsername: user.username,
    employeeNickname: user.nickname,
    recipient: String(body.recipient || "").trim(),
    dutyGroup: body.dutyGroup || inferDutyGroup(mainDuty),
    mainDuty,
    minorTask: String(body.minorTask || "").trim(),
    comment: String(body.comment || "").trim(),
    status: String(body.status || "บันทึกแล้ว").trim(),
    source: "manual"
  };
}

workLogsRouter.use(requireAuth);

workLogsRouter.get("/", async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 200);
    const skip = (page - 1) * limit;
    const filter = buildWorkLogFilter(req.query, req.user);

    const [items, total] = await Promise.all([
      WorkLog.find(filter).sort({ date: -1, time: -1, createdAt: -1 }).skip(skip).limit(limit),
      WorkLog.countDocuments(filter)
    ]);

    res.json({
      items: items.map((item) => item.toJSON()),
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch work logs" });
  }
});

workLogsRouter.get("/:id", async (req, res) => {
  try {
    const log = await WorkLog.findById(req.params.id);
    if (!log) return res.status(404).json({ message: "Work log not found" });

    if (req.user.role !== "admin" && log.employeeUsername !== req.user.username) {
      return res.status(403).json({ message: "You can only view your own records" });
    }

    res.json(log.toJSON());
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch work log" });
  }
});

workLogsRouter.post("/", async (req, res) => {
  try {
    const payload = normalizePayload(req.body, req.user);
    const created = await WorkLog.create(payload);
    res.status(201).json(created.toJSON());
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

workLogsRouter.put("/:id", async (req, res) => {
  try {
    const existing = await WorkLog.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Work log not found" });

    if (req.user.role !== "admin" && existing.employeeUsername !== req.user.username) {
      return res.status(403).json({ message: "You can only update your own records" });
    }

    const payload = normalizePayload(req.body, req.user);
    existing.set(payload);
    const saved = await existing.save();
    res.json(saved.toJSON());
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

workLogsRouter.delete("/:id", async (req, res) => {
  try {
    const existing = await WorkLog.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Work log not found" });

    if (req.user.role !== "admin" && existing.employeeUsername !== req.user.username) {
      return res.status(403).json({ message: "You can only delete your own records" });
    }

    await existing.deleteOne();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Failed to delete work log" });
  }
});
