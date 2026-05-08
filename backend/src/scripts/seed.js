import bcrypt from "bcryptjs";
import { connectDb } from "../db/mongoose.js";
import { User } from "../models/User.js";
import { WorkLog } from "../models/WorkLog.js";
import members from "../data/seedMembers.json" with { type: "json" };
import worklogs from "../data/seedWorklogs.json" with { type: "json" };
import categories from "../data/seedCategories.json" with { type: "json" };

function dutyGroupFor(mainDuty) {
  for (const group of categories.dutyGroups) {
    if (group.duties.includes(mainDuty)) return group.key;
  }
  return null;
}

function localDate(dateText) {
  return new Date(`${dateText}T00:00:00.000Z`);
}

await connectDb();

const staffPasswordHash = await bcrypt.hash("icit1234", 10);
const adminPasswordHash = await bcrypt.hash("admin1234", 10);

await User.updateOne(
  { username: "admin" },
  {
    $set: {
      username: "admin",
      nickname: "ผู้ดูแลระบบ",
      fullName: "ผู้ดูแลระบบ ICIT",
      passwordHash: adminPasswordHash,
      role: "admin",
      active: true
    }
  },
  { upsert: true }
);

for (const member of members) {
  await User.updateOne(
    { username: member.username },
    {
      $set: {
        ...member,
        passwordHash: staffPasswordHash,
        role: member.role || "staff",
        active: member.active !== false
      }
    },
    { upsert: true }
  );
}

await WorkLog.deleteMany({ source: "excel-seed" });

const userByNickname = new Map(
  (await User.find({ role: "staff" })).map((user) => [user.nickname.trim(), user])
);

const docs = worklogs.map((row) => {
  const nickname = (row.employeeNickname || "").trim();
  const user = userByNickname.get(nickname);

  return {
    date: localDate(row.date),
    time: row.time || "00:00",
    employeeUsername: user?.username || nickname || "unknown",
    employeeNickname: nickname || "ไม่ระบุ",
    recipient: row.recipient || "",
    dutyGroup: row.dutyGroup || dutyGroupFor(row.mainDuty),
    mainDuty: row.mainDuty || "ไม่ระบุ",
    minorTask: row.minorTask || "",
    comment: row.comment || "",
    status: row.status || "บันทึกแล้ว",
    source: "excel-seed",
    sourceRow: row.sourceRow || null
  };
});

if (docs.length > 0) {
  await WorkLog.insertMany(docs, { ordered: false });
}

console.log(`Seeded ${members.length} staff users + admin`);
console.log(`Seeded ${docs.length} workload records from Excel`);

process.exit(0);
