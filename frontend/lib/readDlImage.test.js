import { describe, expect, it } from "vitest";
import { validateDlImageFile } from "./readDlImage";
function png(width,height){const bytes=new Uint8Array(24);bytes.set([137,80,78,71,13,10,26,10]);const view=new DataView(bytes.buffer);view.setUint32(16,width);view.setUint32(20,height);return new File([bytes],"fixture.png",{type:"image/png"});}
describe("DL image validation before preview decoding",()=>{
 it("accepts a bounded PNG signature and dimensions",async()=>{await expect(validateDlImageFile(png(810,813))).resolves.toEqual({width:810,height:813});});
 it("rejects large declared dimensions before allocating a canvas or image",async()=>{for(const dimensions of [[7000,500],[4000,4000],[0,100]])await expect(validateDlImageFile(png(...dimensions))).rejects.toThrow(/12 ล้าน/);});
 it("rejects empty files, wrong extensions and disguised non-image bytes",async()=>{for(const file of [new File([],"empty.png"),new File(["%PDF"],"file.pdf"),new File(["not a PNG"],"fake.png")])await expect(validateDlImageFile(file)).rejects.toThrow();});
 it("checks declared byte limits without reading an oversized input",async()=>{let read=false;await expect(validateDlImageFile({name:"big.png",size:11*1024*1024,arrayBuffer(){read=true;}})).rejects.toThrow(/10 MB/);expect(read).toBe(false);});
 it("accepts bounded JPEG SOF dimensions and rejects truncated markers",async()=>{const bytes=new Uint8Array([255,216,255,192,0,17,8,0,200,1,44,3,1,17,0,2,17,0,3,17,0]);await expect(validateDlImageFile(new File([bytes],"fixture.jpg"))).resolves.toEqual({width:300,height:200});await expect(validateDlImageFile(new File([bytes.slice(0,8)],"broken.jpg"))).rejects.toThrow();});
});
