const fs = require('fs');
const path = require('path');

function pngToIco(pngPath, icoPath) {
  const pngBuffer = fs.readFileSync(pngPath);
  const pngSize = pngBuffer.length;

  // ICO Header (6 bytes)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = Icon
  header.writeUInt16LE(1, 4); // Number of images = 1

  // ICO Directory Entry (16 bytes)
  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(0, 0); // Width (0 means 256px)
  dirEntry.writeUInt8(0, 1); // Height (0 means 256px)
  dirEntry.writeUInt8(0, 2); // Colors (0 = no palette)
  dirEntry.writeUInt8(0, 3); // Reserved
  dirEntry.writeUInt16LE(1, 4); // Color planes
  dirEntry.writeUInt16LE(32, 6); // Bits per pixel
  dirEntry.writeUInt32LE(pngSize, 8); // Size of PNG data in bytes
  dirEntry.writeUInt32LE(22, 12); // Offset to PNG data (6 + 16 = 22)

  // Combined ICO file
  const icoBuffer = Buffer.concat([header, dirEntry, pngBuffer]);
  fs.writeFileSync(icoPath, icoBuffer);
  console.log(`✅ Created valid Windows ICO: ${icoPath} (${icoBuffer.length} bytes)`);
}

const rootDir = path.join(__dirname, '..');
const logoPng = path.join(rootDir, 'logo.png');
const logoIco = path.join(rootDir, 'logo.ico');

pngToIco(logoPng, logoIco);
