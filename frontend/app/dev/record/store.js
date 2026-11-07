"use client";

import { useSyncExternalStore } from "react";
import { createPreviewLedger } from "../../../lib/previewLedger";
import { initialRooms, initialDevices, initialLogs, people, tasks } from "./fixtures";
const logs = initialLogs.map(row => {
  const minorTask = row.title === "คุมสอบ Digital Literacy" ? "คุมสอบ DL" : row.title,
    task = tasks.find(item => item.label === minorTask);
  return {
    ...row,
    employeeId: people.find(person => person.displayName === row.person)?.id,
    minorTask,
    mainDuty: task?.major || "",
    dutyGroup: task?.group || "",
    recipient: row.id === "sample-1" ? "0000000000000" : "",
    comment: row.detail,
    ...(row.id === "sample-1" ? {
      resource: {
        kind: "device",
        id: "demo-h2",
        student: "0000000000000"
      }
    } : {})
  };
});
export const recordLedger = createPreviewLedger({
  rooms: initialRooms,
  devices: initialDevices.map(item => ({
    ...item,
    student: null
  })),
  logs
});
const serverSnapshot = recordLedger.getSnapshot();
export const useRecordLedger = () => useSyncExternalStore(recordLedger.subscribe, recordLedger.getSnapshot, () => serverSnapshot);
