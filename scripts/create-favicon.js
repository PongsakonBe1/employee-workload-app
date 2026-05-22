/**
 * Script to create a proper ICO file from labboy-logo.png
 * ICO format: 32x32 PNG embedded inside ICO container
 */
const fs = require("fs");
const path = require("path");

const srcPng = path.join(__dirname, "../frontend/public/labboy-logo.png");
const destIco = path.join(__dirname, "../frontend/public/favicon.ico");

const pngData = fs.readFileSync(srcPng);

// ICO header: 6 bytes
// ICONDIR: reserved(2) + type(2=1 for ICO) + count(2=1)
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);   // reserved
header.writeUInt16LE(1, 2);   // type: 1 = icon
header.writeUInt16LE(1, 4);   // count: 1 image

// ICONDIRENTRY: 16 bytes
// width(1) height(1) colorCount(1) reserved(1) planes(2) bitCount(2) bytesInRes(4) imageOffset(4)
const entry = Buffer.alloc(16);
entry.writeUInt8(0, 0);              // width: 0 = 256 (we'll use PNG as-is, browser will scale)
entry.writeUInt8(0, 1);             // height: 0 = 256
entry.writeUInt8(0, 2);             // colorCount: 0 = more than 256 colors
entry.writeUInt8(0, 3);             // reserved
entry.writeUInt16LE(1, 4);          // planes
entry.writeUInt16LE(32, 6);         // bitCount: 32bpp
entry.writeUInt32LE(pngData.length, 8); // bytesInRes
entry.writeUInt32LE(22, 12);        // imageOffset = 6 (header) + 16 (entry) = 22

const icoBuffer = Buffer.concat([header, entry, pngData]);
fs.writeFileSync(destIco, icoBuffer);

const stat = fs.statSync(destIco);
console.log("favicon.ico created successfully");
console.log("Size:", stat.size, "bytes");
console.log("PNG source size:", pngData.length, "bytes");
console.log("ICO overhead:", stat.size - pngData.length, "bytes (header+entry)");
