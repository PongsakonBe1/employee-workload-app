const sharp = require('sharp');
const fs = require('fs');

const img = fs.readFileSync('public/labboy-workload-logo-bg-black.png');

async function generate() {
  await sharp(img).resize(32, 32).png().toFile('app/favicon.ico');
  console.log('favicon.ico done');
  await sharp(img).resize(32, 32).png().toFile('app/icon.png');
  console.log('icon.png done');
  await sharp(img).resize(180, 180).png().toFile('app/apple-icon.png');
  console.log('apple-icon.png done');
  await sharp(img).resize(192, 192).png().toFile('public/labboy-logo.png');
  console.log('labboy-logo.png done');
}

generate().catch(console.error);
