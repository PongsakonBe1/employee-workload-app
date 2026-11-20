"use client";

import { useMemo, useState } from "react";
import { auth } from "../lib/firebase";
import { canUseProductionCalendarCreate, createProductionCalendarSubmission, productionCalendarWriterEnabled } from "../lib/calendarProductionCreate";
import { productionCalendarCreateDraft, productionCalendarTarget } from "../lib/calendarProductionMutation";
import { PRODUCTION_CALENDAR_API_ORIGIN } from "../lib/calendarServerProtocol";
import { createTrustedCalendarTransport } from "../lib/calendarTrustedTransport";

export function useProductionCalendarManager(user, collection, refresh) {
  const flag = process.env.NEXT_PUBLIC_CALENDAR_PRODUCTION_CREATE;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiOrigin = process.env.NEXT_PUBLIC_API_URL;
  const enabled = productionCalendarWriterEnabled(flag, projectId);
  const allowed = canUseProductionCalendarCreate({ flag, projectId, apiOrigin, user });
  const uid = user?.uid;
  const [state, setState] = useState(null);
  const [notice, setNotice] = useState(null);
  const writer = useMemo(() => {
    if (!allowed || !uid) return null;
    const getUser = () => auth.currentUser?.uid === uid ? auth.currentUser : null;
    return createProductionCalendarSubmission({
      transport: createTrustedCalendarTransport({ getUser, origin: PRODUCTION_CALENDAR_API_ORIGIN, readiness: true }),
      isCurrent: () => Boolean(getUser()),
      onState: next => {
        if (getUser()) setState({ ...next, uid });
      },
    });
  }, [allowed, uid]);
  const current = state?.uid === uid ? state : null;

  async function run(submit) {
    setNotice(null);
    let result;
    try {
      if (!writer) throw new Error("บัญชีนี้ใช้คำสั่งจัดการปฏิทินไม่ได้");
      result = await submit(writer);
    } catch (error) {
      setNotice({ uid, message: error.message, error: true, reload: error.code === "calendar-write-stale" });
      throw error;
    }
    if (!result) return;
    try {
      await refresh();
      setNotice({ uid, message: result.repeated ? "ยืนยันรายการที่บันทึกไว้แล้ว" : "บันทึกแล้ว" });
    } catch {
      setNotice({ uid, message: "บันทึกแล้ว แต่โหลดรายการล่าสุดไม่สำเร็จ", error: true, reload: true });
    }
    return result;
  }

  return {
    enabled,
    saving: Boolean(current?.saving),
    uncertain: Boolean(current?.draft),
    notice: notice?.uid === uid ? notice : null,
    create: row => run(api => api.create(productionCalendarCreateDraft(collection, row))),
    mutate: (action, rows, changes) => run(api => api.mutate({ action, collection, targets: rows.map(row => productionCalendarTarget(collection, row)), changes })),
    retry: () => run(api => api.retry()),
    reload: async () => {
      try {
        await refresh();
        setNotice({ uid, message: "โหลดรายการล่าสุดแล้ว" });
      } catch {
        setNotice({ uid, message: "โหลดรายการล่าสุดไม่สำเร็จ", error: true, reload: true });
      }
    },
  };
}
