"use client";

export function downloadCSV(filename, content) {
  const url = URL.createObjectURL(new Blob(["\ufeff", content], {
    type: "text/csv;charset=utf-8"
  }));
  const link = document.createElement("a");
  try {
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
