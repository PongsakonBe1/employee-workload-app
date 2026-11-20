"use client";

import { Check } from "lucide-react";
import { useAppearance } from "./AppearanceProvider";

export function AppearanceSettings() {
  const { preferences, updatePreferences } = useAppearance();
  return <div className="ui-appearance-settings">
    <fieldset className="ui-form-group">
      <legend>เมนูบนคอมพิวเตอร์</legend>
      <div className="ui-choice-row">
        {[["dock","Dock ลอยตัว"],["sidebar","Sidebar แบบเดิม"]].map(([navigation,label])=><button type="button" key={navigation} className="ui-choice" aria-pressed={(preferences.navigation === "sidebar" ? "sidebar" : "dock") === navigation} onClick={()=>updatePreferences({navigation})}>{label}{(preferences.navigation === "sidebar" ? "sidebar" : "dock") === navigation && <Check size={16} aria-hidden="true"/>}</button>)}
      </div>
      <p className="ui-caption">มือถือใช้ 4 เมนูหลักด้านล่างเหมือนเดิม สลับรูปแบบได้โดยเก็บงานที่กำลังกรอกไว้</p>
    </fieldset>
    <fieldset className="ui-form-group">
      <legend>รูปแบบการแสดงผล</legend>
      <div className="ui-choice-row">
        {[["system", "ตามระบบ"], ["light", "สว่าง"], ["dark", "มืด"]].map(([theme, label]) => <button
          type="button" key={theme}
          className="ui-choice" aria-pressed={preferences.theme === theme}
          onClick={() => updatePreferences({ theme })}
        >
          {label}
          {preferences.theme === theme && <Check size={16} aria-hidden="true" />}
        </button>)}
      </div>
    </fieldset>
    <fieldset className="ui-form-group">
      <legend>พื้นหลังพื้นที่ทำงาน</legend>
      <div className="ui-background-choices">
        {[["classic", "ฟ้า–เขียวเดิม", "ชุดสีจากแอปเดิม"], ["ambient", "สีละมุน", "ฟ้า–ม่วงอ่อน"], ["plain", "เรียบ", "พื้นที่อ่านข้อมูลเต็มที่"]].map(([background, label, detail]) => <button
          type="button" className="ui-background-choice"
          key={background} aria-pressed={preferences.background === background}
          onClick={() => updatePreferences({ background })}
        >
          <span className={`ui-background-sample ui-background-${background}`} aria-hidden="true" />
          <strong>{label}</strong>
          <small>{detail}</small>
          {preferences.background === background && <Check size={17} aria-hidden="true" />}
        </button>)}
      </div>
    </fieldset>
    <fieldset className="ui-form-group">
      <legend>ความสะดวกในการใช้งาน</legend>
      <label className="ui-check-row">
        <span>
          <strong>ลดความโปร่งใส</strong>
          <small>ใช้พื้นทึบกับเมนูและแถบควบคุม เพื่อให้อ่านชัดขึ้น</small>
        </span>
        <input
          type="checkbox" checked={preferences.material === "solid"}
          onChange={event => updatePreferences({ material: event.target.checked ? "solid" : "regular" })}
        />
      </label>
      <label className="ui-check-row">
        <span>
          <strong>ลดการเคลื่อนไหว</strong>
          <small>ระบบยังเคารพการตั้งค่าลดการเคลื่อนไหวของอุปกรณ์เสมอ</small>
        </span>
        <input
          type="checkbox" checked={preferences.motion === "reduce"}
          onChange={event => updatePreferences({ motion: event.target.checked ? "reduce" : "system" })}
        />
      </label>
    </fieldset>
    <p className="ui-caption">บันทึกเฉพาะการแสดงผลบน browser นี้ ใช้ได้กับทุกบทบาท และไม่เปลี่ยนข้อมูลการทำงาน</p>
  </div>;
}
