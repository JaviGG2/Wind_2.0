const puppeteer = require('puppeteer-core');
const GIFEncoder = require('gif-encoder-2');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CAPTURE_SIZE = 320;
const OUT_SIZE = 320;
const DURATION_MS = 15000;
const FPS = 12;
const TOTAL_FRAMES = Math.round(DURATION_MS / 1000 * FPS);
const FRAME_DELAY_CS = Math.round(1000 / FPS / 10);

const srcDir = path.join(__dirname, '..', 'public', 'images');
const outDir = path.join(__dirname, '..', 'public', 'gifs');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const files = ['loading-1.svg','loading-2.svg','loading-3.svg','loading-4.svg','loading-5.svg','loading-6.svg'];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars']
  });

  for (const file of files) {
    const svgPath = path.join(srcDir, file);
    const gifPath = path.join(outDir, file.replace('.svg', '.gif'));
    if (!fs.existsSync(svgPath)) { console.log(`[SKIP] ${file}`); continue; }

    const svgRaw = fs.readFileSync(svgPath, 'utf8');
    const svgContent = svgRaw.replace('<svg', '<svg preserveAspectRatio="xMidYMid meet"');

    const html = `<!DOCTYPE html>
<html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:transparent;display:flex;align-items:center;justify-content:center;width:${CAPTURE_SIZE}px;height:${CAPTURE_SIZE}px;overflow:hidden}
svg{width:100%;height:100%}
</style></head><body>
${svgContent}
</body></html>`;

    const page = await browser.newPage();
    await page.setViewport({ width: CAPTURE_SIZE, height: CAPTURE_SIZE, deviceScaleFactor: 1 });
    await page.goto(`data:text/html,${encodeURIComponent(html)}`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 800));

    const frames = [];
    const interval = DURATION_MS / TOTAL_FRAMES;
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const buf = await page.screenshot({ type: 'png' });
      frames.push(buf);
      if (i < TOTAL_FRAMES - 1) await new Promise(r => setTimeout(r, interval));
    }
    await page.close();

    const encoder = new GIFEncoder(OUT_SIZE, OUT_SIZE);
    const stream = encoder.createReadStream();
    const chunks = [];
    stream.on('data', c => chunks.push(c));
    stream.on('end', () => {
      fs.writeFileSync(gifPath, Buffer.concat(chunks));
      console.log(`[OK] ${file} → ${path.basename(gifPath)} (${TOTAL_FRAMES} frames, ${(Buffer.concat(chunks).length / 1024).toFixed(0)} KB)`);
    });

    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(FRAME_DELAY_CS);
    encoder.setTransparent('#000000');

    for (const frame of frames) {
      const { data } = await sharp(frame)
        .resize(OUT_SIZE, OUT_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .raw()
        .toBuffer({ resolveWithObject: true });
      encoder.addFrame(data);
    }
    encoder.finish();
  }

  await browser.close();
  console.log('Done.');
})();
