"use client";

import { RESOURCE_STATUS_COLUMNS } from "../../../lib/resourcePreview";
export function ResourceExportPreview({
  rows
}) {
  const rooms = rows.filter(row => row.type === "ห้อง").length;
  return <>
    <p className="resource-export-summary" data-testid="resource-export-count">{rows.length} รายการ · ห้อง {rooms} · อุปกรณ์ {rows.length - rooms}</p>
    <p className="ui-caption resource-note">สถานะปัจจุบันทุกห้องและอุปกรณ์ รวมรายการที่หยุดใช้งาน ใช้ข้อมูล ณ ตอนเปิดหน้าต่างนี้ ไม่มีคอลัมน์รหัสผู้ยืม</p>
    <p className="resource-export-hint">เลื่อนตารางแนวนอนเพื่อดูทุกคอลัมน์</p>
    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Keyboard users must be able to pan the scrollable table. */}
    <div className="resource-export-table" role="region" aria-label="ตรวจไฟล์สถานะทรัพยากร" tabIndex={0}><table><caption className="sr-only">ตรวจข้อมูลก่อนดาวน์โหลด CSV</caption><thead><tr>{RESOURCE_STATUS_COLUMNS.map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{[row.id, row.type, row.location, row.status, row.condition, row.barcode, row.order].map((value, column) => <td key={column}>{value}</td>)}</tr>)}</tbody></table></div>
  </>;
}
