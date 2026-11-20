import { GlassButton } from "../ui/GlassControls";

export function CalendarManagerFeedback({ writer, onConfirmed, onReload }) {
  if (!writer.enabled) return null;
  const { notice, saving, uncertain } = writer;
  return <>
    {saving && <p className="ui-caption" role="status">กำลังบันทึกตาราง…</p>}
    {notice && !saving && <p className="ui-caption" role={notice.error ? "alert" : "status"}>{notice.message}</p>}
    {uncertain && <GlassButton disabled={saving} onClick={() => writer.retry().then(onConfirmed).catch(() => {})}>ตรวจผลรายการที่ส่งแล้ว</GlassButton>}
    {notice?.reload && !uncertain && <GlassButton disabled={saving} onClick={() => {
      onReload?.();
      void writer.reload();
    }}>โหลดรายการล่าสุด</GlassButton>}
  </>;
}
