"use client";

import { useEffect, useRef, useState } from 'react';
import { Check } from "lucide-react";
import { Dialog } from './ui/Dialog';
import { GlassButton } from './ui/GlassControls';
import { ReviewSymbol } from './ui/ReviewSymbol';
import '../app/dev/record/record.css';
import { useSharedResourceStatus } from "../hooks/useSharedResourceStatus";
import { RESOURCE_ROOM_IDS } from "../lib/resourceStatusIndex";
import { roomAction, roomDisplayState, roomStatusLabels } from "../lib/resourcePresentation";

const roomDetails = { 303: "Windows", 304: "iOS", 305: "Android", 306: "Linux" };

export default function SmartRoomModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  templateName,
  templateMinorTask 
}) {
  const [selection, setSelection] = useState(null);
  const { status, loading, error: statusError, retry } = useSharedResourceStatus({ enabled: isOpen });
  const roomStatus = status?.roomStatus ?? {};
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);

  const template = `${templateName} ${templateMinorTask ?? ""}`;
  const floor = template.includes("ชั้น 3") ? "3" : template.includes("ชั้น 4") ? "4" : "";
  const rooms = RESOURCE_ROOM_IDS.filter(room => room.startsWith(floor));
  const action = roomAction(selection?.state);
  const selectionChanged = Boolean(selection && status && roomDisplayState(roomStatus[selection.room]) !== selection.state);

  useEffect(() => {
    if (!selectionChanged || submitting.current) return;
    setSelection(null);
    setError("สถานะห้องเปลี่ยนแล้ว กรุณาเลือกห้องอีกครั้ง");
  }, [selectionChanged]);

  const handleConfirm = async () => {
    if (!action || !status || selectionChanged || submitting.current) return;

    const { room, state } = selection;
    const opening = state === "available";
    const floor3 = room.startsWith("3");
    const comment = floor3 ? `${room}/${roomDetails[room]}` : room;
    const minorTask = floor3
      ? opening ? "เช็คอินห้องแลกเปลี่ยนความรู้" : "ปิดห้องแลกเปลี่ยนความรู้"
      : opening ? "เปิดห้องเรียนชั้น 4" : "ปิดห้องเรียนชั้น 4";
    
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      await onSelect(comment, room, minorTask, null);
      onClose();
      setSelection(null);
    } catch {
      setError("บันทึกสถานะห้องไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (submitting.current) return;
    onClose();
    setError("");
    setSelection(null);
  };

  return <Dialog
    open={isOpen}
    onClose={handleClose}
    title={templateName}
    className="record-dialog record-room-dialog"
    busy={saving}
    description={saving ? "กำลังบันทึกงาน…" : undefined}
    footer={<>
      <GlassButton onClick={handleClose} disabled={saving}>ยกเลิก</GlassButton>
      <GlassButton variant="prominent" onClick={handleConfirm} disabled={!action || !status || selectionChanged || saving}>
        {action && !selectionChanged ? `${action} ${selection.room}` : "เลือกห้อง"}
      </GlassButton>
    </>}
  >
    {statusError ? <p role="alert" className="ui-caption">โหลดสถานะล่าสุดไม่สำเร็จ <button type="button" className="underline" onClick={retry}>ลองอีกครั้ง</button></p>
      : loading ? <p role="status" className="ui-caption">กำลังโหลดสถานะห้อง…</p>
      : <div className="record-room-grid">
        {rooms.map(room => {
          const state = roomDisplayState(roomStatus[room]);
          const selected = !selectionChanged && selection?.room === room;
          return <button
            type="button" className="record-resource-tile" key={room}
            aria-pressed={selected}
            onClick={() => { setSelection({ room, state }); setError(""); }} disabled={saving || state === "unknown"}
          >
            <span className="record-tile ui-nav-symbol" data-tone="neutral" aria-hidden="true"><ReviewSymbol name="door" size={22} /></span>
            <strong>ห้อง {room}</strong>
            <span className="record-badge" data-tone={state === "unknown" ? "amber" : "neutral"}>{roomStatusLabels[state]}</span>
            {roomDetails[room] && <small>{roomDetails[room]}</small>}
            {selected && <Check className="record-room-check" size={16} aria-hidden="true" />}
          </button>;
        })}
      </div>}
    {error && <p role="alert" className="record-error">{error}</p>}
  </Dialog>;
}
