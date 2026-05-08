import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { WorkLog } from "../models/WorkLog.js";
import { getFiscalYearRange } from "../utils/fiscalYear.js";

export const statsRouter = express.Router();

statsRouter.use(requireAuth);

statsRouter.get("/summary", async (req, res) => {
  const fiscalYear = req.query.fiscalYear || new Date().getUTCFullYear() + 543;
  const range = getFiscalYearRange(fiscalYear);

  const match = {
    date: {
      $gte: range.start,
      $lt: range.endExclusive
    }
  };

  if (req.user.role !== "admin") {
    match.employeeUsername = req.user.username;
  }

  const [total, byEmployee, byMainDuty, byMinorTask, byMonth, recent] = await Promise.all([
    WorkLog.countDocuments(match),
    WorkLog.aggregate([
      { $match: match },
      { $group: { _id: "$employeeNickname", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } }
    ]),
    WorkLog.aggregate([
      { $match: match },
      { $group: { _id: "$mainDuty", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } }
    ]),
    WorkLog.aggregate([
      { $match: match },
      { $match: { minorTask: { $nin: ["", null] } } },
      { $group: { _id: "$minorTask", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 12 }
    ]),
    WorkLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]),
    WorkLog.find(match).sort({ date: -1, time: -1 }).limit(6)
  ]);

  res.json({
    fiscalYear: {
      buddhist: range.buddhistFiscalYear,
      gregorian: range.gregorianFiscalYear,
      startDate: range.startDate,
      endDate: range.endDateInclusive
    },
    scope: req.user.role === "admin" ? "all" : "me",
    total,
    byEmployee: byEmployee.map((row) => ({ label: row._id || "ไม่ระบุ", count: row.count })),
    byMainDuty: byMainDuty.map((row) => ({ label: row._id || "ไม่ระบุ", count: row.count })),
    byMinorTask: byMinorTask.map((row) => ({ label: row._id || "ไม่ระบุ", count: row.count })),
    byMonth: byMonth.map((row) => ({
      label: `${row._id.year}-${String(row._id.month).padStart(2, "0")}`,
      count: row.count
    })),
    recent: recent.map((item) => item.toJSON())
  });
});
