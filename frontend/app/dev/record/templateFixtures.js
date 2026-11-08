import { combos } from "./fixtures";
const core = [["rooms3", "ห้องแลกเปลี่ยนความรู้", "smart", "", "door", "purple"], ["rooms4", "ห้องเรียน ชั้น 4", "smart", "", "door", "purple"], ["headphones", "ยืม / คืนหูฟัง", "smart", "ยืมหูฟัง", "resources", "green"], ["account", "เปิดใช้บัญชี", "combo", "", "account", "blue"], ["software", "ติดตั้งโปรแกรม", "combo", "", "software", "purple"], ["phone", "รับสายโทรศัพท์", "standard", "รับแจ้งและแก้ปัญหาทางโทรศัพท์", "phone", "amber"], ["plug", "ยืม / คืนปลั๊กไฟ", "smart", "ยืมปลั๊กไฟ", "plug", "green"], ["usb", "ยืม / คืน USB", "smart", "ยืม USB", "usb", "blue"], ["assigned", "งานที่ได้รับมอบหมาย", "standard", "ปฏิบัติงานตามที่ผู้บังคับบัญชามอบหมาย", "history", "amber"]];
export const initialTemplates = core.map(([id, name, kind, minorTask, symbol, tone], order) => ({
  id,
  action: id,
  name,
  minorTask,
  symbol,
  tone,
  order,
  version: 1,
  isActive: true,
  isSmart: kind === "smart",
  isCombo: kind === "combo",
  requireCheckbox: kind === "combo",
  requireRecipient: ["account", "software", "phone", "headphones", "plug", "usb"].includes(id),
  requireComment: ["phone", "assigned"].includes(id),
  comment: "",
  comboItems: combos[id]?.tasks.map((name, index) => ({
    name,
    minorTask: combos[id].minorTasks[index],
    comment: ""
  })) || []
}));
