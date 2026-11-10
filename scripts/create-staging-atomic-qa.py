"""Render an anonymous two-row PDF for the proposed staging atomic-rejection test."""
import json
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

root = Path(__file__).resolve().parent.parent
plan = json.loads((root / "docs/development/calendar-role-concurrency-qa/staging-fixtures.json").read_text(encoding="utf-8"))
assert plan["targetProject"] == "labboy-workload-app-staging"
rows = plan["cases"][3]["requests"][0]
assert len(rows) == 2
output = root / "output/pdf/calendar-role-concurrency-qa/staging-atomic-qa.pdf"
output.parent.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont("QaThai", "C:/Windows/Fonts/tahoma.ttf"))
pdf = canvas.Canvas(str(output), pagesize=(842, 595))
pdf.setTitle("Staging QA - atomic rejection - synthetic timetable")
pdf.setFont("QaThai", 16)
pdf.drawString(30, 555, "Staging QA - ATOMIC REJECTION")
pdf.setFont("QaThai", 10)
pdf.drawString(30, 531, f"Synthetic fixture only | Semester {plan['semester']} | Higher/other education group")
pdf.drawString(30, 514, f"Review term: {plan['atomicImportTerm']['start']} through {plan['atomicImportTerm']['end']}")
days = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"]
from datetime import date

for index, row in enumerate(rows):
    header_y, top = (490, 470) if index == 0 else (330, 310)
    pdf.setFont("QaThai", 11)
    pdf.drawString(30, header_y, f"{row['room']} ห้องเรียน QA")
    left, width, header_height, row_height = 100, 42, 28, 42
    pdf.setFont("QaThai", 6)
    for slot in range(16):
        minute = 480 + slot * 30
        label = f"{minute // 60:02}.{minute % 60:02}-{(minute + 30) // 60:02}.{(minute + 30) % 60:02}"
        pdf.rect(left + slot * width, top - header_height, width, header_height)
        pdf.drawCentredString(left + (slot + .5) * width, top - 17, label)
    bottom = top - header_height - row_height
    pdf.rect(30, bottom, left - 30, row_height)
    pdf.setFont("QaThai", 10)
    pdf.drawCentredString((30 + left) / 2, bottom + 17, days[date.fromisoformat(row["date"]).weekday()])
    minute = lambda value: int(value[:2]) * 60 + int(value[3:])
    first, last = (minute(row["start"]) - 480) // 30, (minute(row["end"]) - 480) // 30
    for start, end in [(0, first), (first, last), (last, 16)]:
        if start < end:
            pdf.rect(left + start * width, bottom, (end - start) * width, row_height)
    available = (last - first) * width - 8
    size = min(9, available / pdfmetrics.stringWidth(row["title"], "QaThai", 1))
    pdf.setFont("QaThai", size)
    pdf.drawCentredString(left + (first + last) / 2 * width, bottom + 17, row["title"])

pdf.setFont("QaThai", 10)
for index, line in enumerate([
    "Use this file only after the overlap QA winner has been saved.",
    "Review exactly two rows and the term above before confirming import.",
    "Expected: reject the whole batch. The GOOD row must not be saved.",
    "Preparing this fixture is not approval to write staging or deploy production.",
]):
    pdf.drawString(30, 160 - index * 19, line)
pdf.save()
print("Created synthetic staging atomic QA PDF")
