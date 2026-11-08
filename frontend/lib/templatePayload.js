// Preserve the existing create contract, including the Combo fields shown by its form.
export function templateCreateFields(value) {
  return {
    name: value.name,
    minorTask: value.minorTask || "",
    mainDuty: value.mainDuty || "",
    dutyGroup: value.dutyGroup || "main",
    comment: value.comment || "",
    department: value.department || null,
    requireRecipient: Boolean(value.requireRecipient),
    requireComment: Boolean(value.requireComment),
    isSmart: Boolean(value.isSmart),
    isCombo: Boolean(value.isCombo),
    comboItems: (value.comboItems || []).map(item => ({
      name: item.name || "",
      minorTask: item.minorTask || "",
      mainDuty: item.mainDuty || "",
      comment: item.comment || ""
    })),
    requireCheckbox: Boolean(value.requireCheckbox),
    isActive: true,
    usageCount: 0
  };
}
