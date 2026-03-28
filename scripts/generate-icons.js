/**
 * Generates PNG icon files for the Warden extension.
 * Uses only built-in Node.js modules — no external dependencies.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(data) {
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function drawIcon(size) {
  
  const [bgR, bgG, bgB] = [124, 58, 237];
  
  const pixels = [];

  for (let y = 0; y < size; y++) {
    pixels.push(0); 
    for (let x = 0; x < size; x++) {
      const nx = x / size; 
      const ny = y / size;

      
      let r = bgR, g = bgG, b = bgB;

      
      const cx = 0.5, cy = 0.55; 
      const bodyW = 0.5, bodyH = 0.38;
      const archR = 0.18;
      const archTop = 0.18;
      const archThick = size <= 16 ? 0.12 : 0.09;
      const arcCenterY = cy - bodyH / 2 + 0.02;

      
      const inBody =
        nx > cx - bodyW / 2 &&
        nx < cx + bodyW / 2 &&
        ny > cy - bodyH / 2 &&
        ny < cy + bodyH / 2;

      
      const dx = nx - cx;
      const dy = ny - (arcCenterY + archTop / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const inArch =
        dist > archR - archThick &&
        dist < archR + archThick / 4 &&
        ny < arcCenterY + archTop / 2 + 0.02;

      
      const khDist = Math.sqrt((nx - cx) ** 2 + (ny - (cy - 0.02)) ** 2);
      const inKeyhole = khDist < 0.065 && size >= 32;

      if ((inBody || inArch) && !inKeyhole) {
        r = 255; g = 255; b = 255;
      }

      pixels.push(r, g, b);
    }
  }

  const raw = Buffer.from(pixels);
  const compressed = zlib.deflateSync(raw);

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  
  ihdr[9] = 2;  
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), 
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const buf = drawIcon(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), buf);
  console.log(`  ✓ icon${size}.png`);
}

console.log('Icons generated.');
