/**
 * Rendert eine Demo als Video: Bild für Bild (30 fps, PNG, also ohne
 * Zwischenverlust) in headless Chromium, Ton offline per OfflineAudioContext,
 * dann mit ffmpeg zu MP4 (H.264, CRF 18 = visuell verlustfrei, 1280×800).
 *
 *   node tools/video/render.js <demo> [ausgabe.mp4] [maxSekunden]
 *
 * Läuft im GitHub-Workflow .github/workflows/videos.yml, die Videos landen
 * im Release „videos“ – nicht im Repo. Neue Demo = neuer Eintrag in DEMOS.
 */
"use strict";
const { spawn } = require("child_process");
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os");

const DEMOS = require("./demos.js");
const W = 1280, H = 800, FPS = 30, ROOT = path.resolve(__dirname, "../..");

/** kleiner statischer Webserver für das Repo */
function serve() {
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".json": "application/json" };
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}

function wav(buf) {
  const pcm = Buffer.from(buf.pcm, "base64"), h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(buf.sr, 24); h.writeUInt32LE(buf.sr * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

async function main() {
  const { chromium } = require("playwright");
  const name = process.argv[2], C = DEMOS[name];
  if (!C) { console.error("Unbekannte Demo. Möglich: " + Object.keys(DEMOS).join(", ")); process.exit(2); }
  const out = path.resolve(process.argv[3] || name + ".mp4"), limit = Number(process.argv[4] || Infinity);
  const server = await serve(), base = "http://127.0.0.1:" + server.address().port + "/";
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto(base + C.page);
  if (C.gl) await page.addStyleTag({ content: "#gl{width:" + W + "px!important;height:" + H + "px!important;aspect-ratio:auto!important;max-width:none!important}" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  const dur = Math.min(limit, await page.evaluate(C.dur)), n = Math.ceil(dur * FPS);
  console.log(name + ": " + dur.toFixed(2) + " s, " + n + " Bilder");

  // 1. Ton
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "video-")), audioFile = path.join(tmp, "ton.wav");
  const audio = await page.evaluate(async ([expr, DUR]) => {
    const buf = await (new Function("DUR", "return " + expr))(DUR);
    const L = buf.getChannelData(0), R = buf.getChannelData(1), out = new Int16Array(L.length * 2);
    for (let i = 0; i < L.length; i++) { out[2 * i] = Math.max(-1, Math.min(1, L[i])) * 32767; out[2 * i + 1] = Math.max(-1, Math.min(1, R[i])) * 32767; }
    let bin = ""; const bytes = new Uint8Array(out.buffer);
    for (let i = 0; i < bytes.length; i += 32768) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
    return { sr: buf.sampleRate, pcm: btoa(bin) };
  }, [C.audio, dur]);
  fs.writeFileSync(audioFile, wav(audio));
  console.log("Ton fertig");

  // 2. Bilder direkt an ffmpeg
  let vf = "scale=" + W + ":" + H + ":flags=" + (C.pixel ? "neighbor" : "lanczos"), af = "anull";
  if (C.tail) { vf += ",tpad=stop_mode=clone:stop_duration=" + C.tail + ",fade=t=out:st=" + dur + ":d=" + C.tail; af = "afade=t=out:st=" + dur + ":d=" + C.tail; }
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-", "-i", audioFile,
    "-vf", vf + ",format=yuv420p", "-af", af, "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-c:a", "aac", "-b:a", "192k",
    "-movflags", "+faststart", "-shortest", out], { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((ok, fail) => ff.on("close", code => code === 0 ? ok() : fail(new Error("ffmpeg " + code))));
  const t0 = Date.now();
  for (let i = 0; i < n; i += 10) {
    const urls = await page.evaluate(([from, to, canvas, frame]) => {
      const c = document.getElementById(canvas), f = new Function("t", "return " + frame), list = [];
      for (let k = from; k < to; k++) { f(k / 30); list.push(c.toDataURL("image/png")); }
      return list;
    }, [i, Math.min(n, i + 10), C.canvas, C.frame]);
    for (const u of urls) if (!ff.stdin.write(Buffer.from(u.slice(u.indexOf(",") + 1), "base64"))) await new Promise(r => ff.stdin.once("drain", r));
    if (i % 600 === 0) console.log("  Bild " + i + "/" + n + " nach " + Math.round((Date.now() - t0) / 1000) + " s");
  }
  ff.stdin.end();
  await done;
  await browser.close(); server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log("fertig: " + out + " (" + (fs.statSync(out).size / 1e6).toFixed(1) + " MB) in " + Math.round((Date.now() - t0) / 1000) + " s");
  if (errors.length) { console.error("Fehler auf der Seite:", errors); process.exit(1); }
}
main().catch(e => { console.error(e); process.exit(1); });
