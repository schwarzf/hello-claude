/**
 * Rendert eine Demo als Video: Bild für Bild (30 fps) in headless Chromium,
 * Ton offline per OfflineAudioContext, dann mit ffmpeg zu MP4
 * (H.264, CRF 18 = visuell verlustfrei, 1280×800). Die Bilder gehen roh
 * (RGBA) an ffmpeg – verlustfrei und ohne teures PNG-Kodieren.
 *
 *   node tools/video/render.js <demo> <ausgabe.mp4>            ganzes Video mit Ton
 *   node tools/video/render.js <demo> <teil.mp4> --teil 2/4     nur Bilder des 2. von 4 Teilen
 *   node tools/video/render.js <demo> <ton.wav> --ton          nur den Ton
 *   node tools/video/render.js --zusammen <demo> <aus.mp4> <ton.wav> <teil1.mp4> …
 *   Optional: --max <Sekunden> (zum Ausprobieren)
 *
 * Läuft im Workflow .github/workflows/videos.yml; lange Demos (Feld „teile“
 * in demos.js) werden dort in mehreren Jobs parallel gerendert.
 */
"use strict";
const { spawn } = require("child_process");
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os");
const DEMOS = require("./demos.js");
const W = 1280, H = 800, FPS = 30, WARMUP = 90, ROOT = path.resolve(__dirname, "../..");

function run(args) {
  return new Promise((ok, fail) => {
    const ff = spawn("ffmpeg", ["-y", "-loglevel", "error"].concat(args), { stdio: ["ignore", "inherit", "inherit"] });
    ff.on("close", code => code === 0 ? ok() : fail(new Error("ffmpeg " + code)));
  });
}

/** kleiner statischer Webserver für das Repo; POST /bild nimmt rohe Pixel entgegen */
let sink = null;
function serve() {
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".json": "application/json" };
  const server = http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/bild") {
      const parts = [];
      req.on("data", d => parts.push(d));
      req.on("end", () => {
        const ok = sink.write(Buffer.concat(parts));
        const reply = () => { res.writeHead(204); res.end(); };
        if (ok) reply(); else sink.once("drain", reply);
      });
      return;
    }
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

/** Video-Filter: auf 1280×800 bringen, bei „tail“ am Ende ausblenden */
function filters(C, dur) {
  const sz = C.size || [W, H];
  let vf = "scale=" + sz[0] + ":" + sz[1] + ":flags=" + (C.pixel ? "neighbor" : "lanczos"), af = "anull";
  if (C.tail) { vf += ",tpad=stop_mode=clone:stop_duration=" + C.tail + ",fade=t=out:st=" + dur + ":d=" + C.tail; af = "afade=t=out:st=" + dur + ":d=" + C.tail; }
  return { vf: vf + ",format=yuv420p", af };
}
const X264 = ["-c:v", "libx264", "-preset", "slow", "-crf", "18"];
const AAC = ["-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart"];

async function open(C) {
  const { chromium } = require("playwright");
  const server = await serve(), base = "http://127.0.0.1:" + server.address().port + "/";
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-accelerated-2d-canvas"] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto(base + C.page);
  if (C.gl) await page.addStyleTag({ content: "#gl{width:" + W + "px!important;height:" + H + "px!important;aspect-ratio:auto!important;max-width:none!important}" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  return { page, errors, close: async () => { await browser.close(); server.close(); } };
}

async function audioTo(page, C, dur, file) {
  const audio = await page.evaluate(async ([expr, DUR]) => {
    const buf = await (new Function("DUR", "return " + expr))(DUR);
    const L = buf.getChannelData(0), R = buf.getChannelData(1), out = new Int16Array(L.length * 2);
    for (let i = 0; i < L.length; i++) { out[2 * i] = Math.max(-1, Math.min(1, L[i])) * 32767; out[2 * i + 1] = Math.max(-1, Math.min(1, R[i])) * 32767; }
    let bin = ""; const bytes = new Uint8Array(out.buffer);
    for (let i = 0; i < bytes.length; i += 32768) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
    return { sr: buf.sampleRate, pcm: btoa(bin) };
  }, [C.audio, dur]);
  fs.writeFileSync(file, wav(audio));
}

/** Bilder from…to-1 roh an ffmpeg; Bilder ab skipFrom…from-1 werden nur zum Einschwingen gezeichnet */
async function frames(page, C, skipFrom, from, to, ffArgs) {
  // ein Bild vorweg zeichnen: Shader-Demos setzen dabei ihre Fläche auf 1280×800
  const size = await page.evaluate(([id, frame, t]) => { new Function("t", "return " + frame)(t); const c = document.getElementById(id); return [c.width, c.height]; }, [C.canvas, C.frame, skipFrom / FPS]);
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", size[0] + "x" + size[1], "-framerate", String(FPS), "-i", "-"].concat(ffArgs),
    { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((ok, fail) => ff.on("close", code => code === 0 ? ok() : fail(new Error("ffmpeg " + code))));
  sink = ff.stdin;
  const t0 = Date.now(), total = to - from;
  for (let i = skipFrom; i < to; i += 30) {
    await page.evaluate(async ([a, b, keep, canvas, frame]) => {
      const c = document.getElementById(canvas), f = new Function("t", "return " + frame);
      let g = c.getContext("2d", { willReadFrequently: true });
      if (!g) {   // WebGL: direkt nach dem Zeichnen in eine 2D-Fläche kopieren
        window.__copy = window.__copy || document.createElement("canvas");
        window.__copy.width = c.width; window.__copy.height = c.height;
        g = window.__copy.getContext("2d", { willReadFrequently: true });
      }
      for (let k = a; k < b; k++) {
        f(k / 30);
        if (k < keep) continue;
        if (g.canvas !== c) g.drawImage(c, 0, 0);
        await fetch("/bild", { method: "POST", body: g.getImageData(0, 0, c.width, c.height).data });
      }
    }, [i, Math.min(to, i + 30), from, C.canvas, C.frame]);
    if (i >= from && (i - from) % 600 < 30) console.log("  Bild " + (i - from) + "/" + total + " nach " + Math.round((Date.now() - t0) / 1000) + " s");
  }
  ff.stdin.end();
  await done;
  console.log("  " + total + " Bilder in " + Math.round((Date.now() - t0) / 1000) + " s");
}

async function main() {
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i < 0 ? null : a.splice(i, 2)[1]; };
  const max = Number(opt("--max") || Infinity), teil = opt("--teil"), nurTon = a.indexOf("--ton") >= 0 && a.splice(a.indexOf("--ton"), 1);
  if (a[0] === "--zusammen") {     // Teile verlustfrei aneinanderhängen und Ton dazu
    const [, name, out, ton, ...teile] = a, C = DEMOS[name], list = path.join(os.tmpdir(), "teile-" + process.pid + ".txt");
    fs.writeFileSync(list, teile.map(t => "file '" + path.resolve(t) + "'").join("\n"));
    const f = filters(C, Number(fs.readFileSync(ton + ".dauer", "utf8")));
    await run(["-f", "concat", "-safe", "0", "-i", list, "-i", ton, "-c:v", "copy", "-af", f.af].concat(AAC, ["-shortest", out]));
    console.log("fertig: " + out + " (" + (fs.statSync(out).size / 1e6).toFixed(1) + " MB)");
    return;
  }
  const name = a[0], C = DEMOS[name], out = path.resolve(a[1] || name + ".mp4");
  if (!C) { console.error("Unbekannte Demo. Möglich: " + Object.keys(DEMOS).join(", ")); process.exit(2); }
  const b = await open(C);
  const dur = Math.min(max, await b.page.evaluate(C.dur)), n = Math.ceil(dur * FPS);
  console.log(name + ": " + dur.toFixed(2) + " s, " + n + " Bilder" + (teil ? ", Teil " + teil : ""));
  const f = filters(C, dur);
  if (nurTon) {
    await audioTo(b.page, C, dur, out);
    fs.writeFileSync(out + ".dauer", String(dur));
  } else if (teil) {
    const [i, k] = teil.split("/").map(Number), from = Math.round(n * (i - 1) / k), to = Math.round(n * i / k);
    if (C.tail) throw new Error("Demos mit Ausblenden (tail) werden nicht geteilt");
    await frames(b.page, C, Math.max(0, from - WARMUP), from, to, ["-vf", f.vf].concat(X264, [out]));
  } else {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "video-")), ton = path.join(tmp, "ton.wav");
    await audioTo(b.page, C, dur, ton);
    console.log("Ton fertig");
    const silent = path.join(tmp, "bild.mp4");
    await frames(b.page, C, 0, 0, n, ["-vf", f.vf].concat(X264, [silent]));
    await run(["-i", silent, "-i", ton, "-c:v", "copy", "-af", f.af].concat(AAC, ["-shortest", out]));
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  await b.close();
  console.log("fertig: " + out + " (" + (fs.statSync(out).size / 1e6).toFixed(1) + " MB)");
  if (b.errors.length) { console.error("Fehler auf der Seite:", b.errors); process.exit(1); }
}
main().catch(e => { console.error(e); process.exit(1); });
