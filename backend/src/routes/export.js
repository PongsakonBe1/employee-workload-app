import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { WorkLog } from "../models/WorkLog.js";
import { getFiscalYearRange } from "../utils/fiscalYear.js";
import { toCsv } from "../utils/csv.js";

export const exportRouter = express.Router();

exportRouter.use(requireAuth);

exportRouter.get("/fiscal-year/:fiscalYear.csv", async (req, res) => {
  try {
    const range = getFiscalYearRange(req.params.fiscalYear);
    const filter = {
      date: {
        $gte: range.start,
        $lt: range.endExclusive
      }
    };

    if (req.user.role !== "admin") {
      filter.employeeUsername = req.user.username;
    } else if (req.query.employee) {
      filter.employeeUsername = String(req.query.employee).trim();
    }

    const rows = await WorkLog.find(filter).sort({ date: 1, time: 1, employeeNickname: 1 });

    const csv = toCsv(rows, [
      { label: "วันที่", value: (r) => r.date.toISOString().slice(0, 10) },
      { label: "เวลา", value: "time" },
      { label: "ผู้ให้บริการ", value: "employeeNickname" },
      { label: "ผู้รับบริการ", value: "recipient" },
      { label: "กลุ่มงาน", value: "dutyGroup" },
      { label: "หัวข้อการให้บริการ", value: "mainDuty" },
      { label: "หัวข้อการให้บริการ(หัวข้อรอง)", value: "minorTask" },
      { label: "Comment", value: "comment" },
      { label: "สถานะ", value: "status" },
      { label: "แหล่งข้อมูล", value: "source" },
      { label: "สร้างเมื่อ", value: (r) => r.createdAt?.toISOString?.() || "" }
    ]);

    const filename = `icit-workload-fy${range.buddhistFiscalYear}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
