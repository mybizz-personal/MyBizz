import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CRC32 implementation
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPng(size, primaryColor = [134, 59, 255]) {
  const width = size;
  const height = size;

  // Raw pixel data: for each scanline: 1 filter byte (0) + width * 4 (RGBA)
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  const radius = size * 0.22;
  const cx = size / 2;
  const cy = size / 2;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      
      // Rounded rect card background
      const dx = Math.max(Math.abs(x - cx) - (size * 0.38), 0);
      const dy = Math.max(Math.abs(y - cy) - (size * 0.38), 0);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Background gradient from purple to violet
        const grad = y / height;
        const r = Math.round(primaryColor[0] * (1 - grad * 0.2));
        const g = Math.round(primaryColor[1] * (1 - grad * 0.2));
        const b = Math.round(primaryColor[2] * (1 - grad * 0.1));

        // Draw an inner store/cart symbol in white
        const isIcon = (
          (x >= size * 0.32 && x <= size * 0.68 && y >= size * 0.42 && y <= size * 0.72) &&
          (x <= size * 0.36 || x >= size * 0.64 || y <= size * 0.46 || y >= size * 0.68 || 
           (x >= size * 0.46 && x <= size * 0.54 && y >= size * 0.54 && y <= size * 0.64))
        ) || (
          // Roof / roof overhang
          (y >= size * 0.30 && y <= size * 0.42 && 
           x >= size * 0.28 + (size * 0.42 - y) * 0.5 && 
           x <= size * 0.72 - (size * 0.42 - y) * 0.5)
        );

        if (isIcon) {
          rawData[pixelOffset] = 255;
          rawData[pixelOffset + 1] = 255;
          rawData[pixelOffset + 2] = 255;
          rawData[pixelOffset + 3] = 255;
        } else {
          rawData[pixelOffset] = r;
          rawData[pixelOffset + 1] = g;
          rawData[pixelOffset + 2] = b;
          rawData[pixelOffset + 3] = 255;
        }
      } else {
        // Transparent outside
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const header = Buffer.alloc(4);
  header.writeUInt32BE(len, 0);

  const body = Buffer.concat([typeBuf, data]);
  const crc = crc32(body);
  const footer = Buffer.alloc(4);
  footer.writeUInt32BE(crc, 0);

  return Buffer.concat([header, body, footer]);
}

const outDir = path.resolve(__dirname, '../public');
fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), createPng(192));
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), createPng(512));
console.log('Successfully generated pwa-192x192.png and pwa-512x512.png');
