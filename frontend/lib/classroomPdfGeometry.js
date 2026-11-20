// PDF.js 5.6 vector path adapter; bounded to timetable-sized documents.
const multiply = (a,b) => [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
export async function classroomPageGeometry(page, OPS) {
  if (page.rotate !== 0) throw new Error("กรุณาหมุน PDF ให้ตั้งตรงก่อนนำเข้า");
  const viewport = page.getViewport({scale:1});
  const text = await page.getTextContent(), operations = await page.getOperatorList();
  if (text.items.length > 10000 || operations.fnArray.length > 150000) throw new Error("PDF ซับซ้อนเกินขอบเขต กรุณาแบ่งไฟล์");
  const items = text.items.filter(item=>typeof item.str === "string").map(item=>({str:item.str,x:item.transform[4],y:viewport.height-item.transform[5],width:item.width,height:item.height}));
  const lines = [], stack = [];let matrix = [1,0,0,1,0,0];
  const point = (x,y) => viewport.convertToViewportPoint(matrix[0]*x+matrix[2]*y+matrix[4],matrix[1]*x+matrix[3]*y+matrix[5]);
  const edge = (from,to) => { if (!from || !to) return;const a=point(...from),b=point(...to);if (Math.abs(a[0]-b[0])<1 || Math.abs(a[1]-b[1])<1) lines.push({x1:a[0],y1:a[1],x2:b[0],y2:b[1]}); };
  for (let i=0;i<operations.fnArray.length;i++) {
    const fn=operations.fnArray[i],args=operations.argsArray[i];
    if (fn===OPS.save) stack.push([...matrix]);
    else if (fn===OPS.restore) matrix=stack.pop()||[1,0,0,1,0,0];
    else if (fn===OPS.transform) matrix=multiply(matrix,args);
    else if (fn===OPS.constructPath && args[0]!==OPS.endPath && args[2]) {
      const path=args[1][0];let cursor=null,origin=null;
      for (let j=0;j<path.length;) {
        const op=path[j++];
        if (op===0) {cursor=[path[j++],path[j++]];origin=cursor;}
        else if (op===1) {const next=[path[j++],path[j++]];edge(cursor,next);cursor=next;}
        else if (op===2) {j+=4;cursor=[path[j++],path[j++]];}
        else if (op===3) {j+=4;cursor=null;}
        else if (op===4) {edge(cursor,origin);cursor=origin;}
        else throw new Error("รูปแบบเส้นตาราง PDF ไม่รองรับ");
      }
    }
    if (lines.length>50000) throw new Error("เส้นตารางมากเกินขอบเขต กรุณาแบ่งไฟล์");
  }
  return {width:viewport.width,height:viewport.height,items,lines};
}
