"""Generate anonymous PDF geometry fixtures; no production timetable data."""
from pathlib import Path
import sys
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

destination = Path(sys.argv[1])
destination.parent.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont("FixtureThai", "C:/Windows/Fonts/tahoma.ttf"))
pdf = canvas.Canvas(str(destination), pagesize=(595, 842))
pdf.setFont("FixtureThai", 12)
pdf.drawString(30, 790, "ตารางทดสอบ 2/2569")
pdf.drawString(30, 750, "407 ห้องเรียน")
left, top, width, height = 70, 720, 36, 26
pdf.setFont("FixtureThai", 7)
for i in range(13):
    pdf.rect(left+i*width, top-height, width, height)
    pdf.drawCentredString(left+(i+.5)*width, top-16, f"{8+i:02}.00-{9+i:02}.00")
pdf.setFont("FixtureThai", 10)
for day, label in enumerate(["จันทร์", "อังคาร"]):
    y=top-height*(day+2)
    pdf.rect(30, y, 40, height)
    pdf.drawString(32, y+9, label)
    for a,b in ([(0,9),(9,11),(11,13)] if day==0 else [(0,13)]):
        pdf.rect(left+a*width, y, (b-a)*width, height)
    if day==0:
        pdf.drawCentredString(left+10*width,y+9,"วิชาตัวอย่าง A")
        pdf.drawCentredString(left+12*width,y+9,"วิชาตัวอย่าง B")
    else:
        pdf.setFillColorRGB(.65,.65,.65)
        pdf.rect(left,y,13*width,height,fill=1)
        pdf.setFillColorRGB(0,0,0)
        pdf.drawCentredString(left+6.5*width,y+9,"งดให้บริการ")
pdf.save()
