const sharp = require('sharp');
const GIFEncoder = require('gif-encoder-2');
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'public', 'images');
const outDir = path.join(__dirname, '..', 'public', 'gifs');
const SIZE = 120;

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const files = ['loading-1.svg','loading-2.svg','loading-3.svg','loading-4.svg','loading-5.svg','loading-6.svg'];

(async () => {
  for (const file of files) {
    const svgPath = path.join(srcDir, file);
    const gifPath = path.join(outDir, file.replace('.svg', '.gif'));

    if (!fs.existsSync(svgPath)) {
      console.log(`[SKIP] ${file} — not found`);
      continue;
    }

    const svgBuf = fs.readFileSync(svgPath);

    try {
      const { data, info } = await sharp(svgBuf).resize(SIZE, SIZE).raw().toBuffer({ resolveWithObject: true });

      const encoder = new GIFEncoder(info.width, info.height);
      const stream = encoder.createReadStream();
      const chunks = [];
      stream.on('data', c => chunks.push(c));
      stream.on('end', () => {
        fs.writeFileSync(gifPath, Buffer.concat(chunks));
        console.log(`[OK] ${file} → ${path.basename(gifPath)} (${info.width}x${info.height}, ${chunks.length} chunks)`);
      });

      encoder.start();
      encoder.setRepeat(0);
      encoder.setDelay(0);
      encoder.addFrame(data);
      encoder.finish();
    } catch (err) {
      console.error(`[ERR] ${file}: ${err.message}`);
    }
  }
  console.log('Done.');
})();
