// Robi pionowe filmiki (1080x1920) z newsów: lektor + napisy + zdjęcie z przybliżeniem.
//   node tiktok/film.js          -> newsy z dziś/wczoraj, które nie mają jeszcze filmu
//   node tiktok/film.js 35       -> tylko post o id 35 (nadpisuje)
//   node tiktok/film.js --viral [ile]  -> filmy z tiktok/viral.json (krótkie, z haczykiem)
//   node tiktok/film.js --ciekawostki [ile] -> ciekawostki bez filmu (domyślnie 1)
// Wynik: tiktok/filmy/035.mp4
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer-core";
import { czcionka, KONTO, PALETY, PALETY_NEWS } from "../szablon.js";

const W = 1080, H = 1920, FPS = 30;
const GLOS = process.env.TTS_GLOS || "pl-PL-MarekNeural";

const PRZEGLADARKI = [
  process.env.CHROME_PATH,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
].filter(Boolean);
const BROWSER = PRZEGLADARKI.find((p) => fs.existsSync(p));

async function ffmpegPath() {
  try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); return "ffmpeg"; }
  catch { return (await import("ffmpeg-static")).default; }
}
const FFMPEG = await ffmpegPath();
const PYTHON = process.platform === "win32" ? "py" : "python3";

const nr3 = (id) => String(id).padStart(3, "0");
const czysty = (s) => s.replace(/\*+/g, "").replace(/\s+/g, " ").trim();
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

const trybViral = process.argv[2] === "--viral";
const PLIK_POSTOW = trybViral ? "tiktok/viral.json" : "posts.json";
const posts = JSON.parse(fs.readFileSync(PLIK_POSTOW, "utf8"));
const trybCiek = process.argv[2] === "--ciekawostki" || trybViral;
const ileCiek = trybCiek ? Number(process.argv[3] || 1) : 0;
const arg = process.argv[2] && !trybCiek ? Number(process.argv[2]) : null;
const dzis = new Date();
const ostatnie = [0, 1].map((d) => new Date(dzis - d * 864e5).toISOString().slice(0, 10));

fs.mkdirSync("tiktok/filmy", { recursive: true });
const TMP = `tiktok/tmp_${process.argv[2] || "x"}`.replace(/-/g, "");

const naStronie = fs.existsSync("docs/filmy.json") ? JSON.parse(fs.readFileSync("docs/filmy.json", "utf8")).map((x) => x.id) : [];
const maFilm = (p) => fs.existsSync(`tiktok/filmy/${nr3(p.id)}.mp4`) || fs.existsSync(`tiktok/wyslane/${nr3(p.id)}.json`) || naStronie.includes(p.id);
const doZrobienia = trybCiek
  ? posts.filter((p) => !p.typ && !maFilm(p))
      .slice(0, ileCiek)
  : posts.filter((p) => {
  if (arg !== null) return p.id === arg;
  return p.typ === "news" && ostatnie.includes(p.data) &&
    !fs.existsSync(`tiktok/filmy/${nr3(p.id)}.mp4`) && !fs.existsSync(`tiktok/wyslane/${nr3(p.id)}.json`) && !naStronie.includes(p.id) &&
    fs.existsSync(`zdjecia/${nr3(p.id)}.jpg`);
});
if (!doZrobienia.length) { console.log("Brak nowych postów do filmów."); process.exit(0); }
// brakujące zdjęcia (np. w chmurze) – dociągamy z Pixabay
for (const p of doZrobienia)
  if (!fs.existsSync(`zdjecia/${nr3(p.id)}.jpg`))
    try { execFileSync("node", ["pobierz_zdjecia.js", String(p.id)], { stdio: "inherit", env: { ...process.env, POSTY: PLIK_POSTOW } }); } catch {}

const FONTS = czcionka("inter", "Inter") + czcionka("inter-tight", "Inter Tight");
const CSS = `<style>${FONTS}</style><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;background:transparent;overflow:hidden;font-family:Inter,sans-serif;color:#fff}
em{font-style:normal;color:var(--ak)}
</style>`;

// warstwa stała: tytuł u góry, logo, przyciemnienia
const warstwa = (p, pal) => `<!doctype html><html><head><meta charset="utf-8">${CSS}<style>
:root{--ak:${pal.akcent};--a:${pal.a}}
.g1{position:absolute;inset:0 0 auto 0;height:900px;background:linear-gradient(180deg,rgba(8,8,12,.92) 0%,rgba(8,8,12,.75) 45%,rgba(8,8,12,0) 100%)}
.g2{position:absolute;inset:auto 0 0 0;height:900px;background:linear-gradient(0deg,rgba(8,8,12,.85) 0%,rgba(8,8,12,.4) 50%,rgba(8,8,12,0) 100%)}
.top{position:absolute;left:70px;right:150px;top:170px}
.badge{display:inline-flex;align-items:center;gap:14px;background:var(--a);padding:12px 24px;border-radius:999px;
  font:800 30px 'Inter Tight';letter-spacing:.06em;text-transform:uppercase}
.badge i{width:14px;height:14px;border-radius:50%;background:#fff;animation:none}
h1{margin-top:30px;font:900 76px/1.04 'Inter Tight';letter-spacing:-.025em;text-shadow:0 4px 30px rgba(0,0,0,.5)}
.zr{margin-top:22px;font:500 26px Inter;opacity:.7}
.logo{position:absolute;left:70px;bottom:250px;display:flex;align-items:center;gap:14px;font:800 36px 'Inter Tight'}
.logo i{width:24px;height:24px;border-radius:50%;background:var(--ak);box-shadow:0 0 24px var(--ak)}
</style></head><body>
<div class="g1"></div><div class="g2"></div>
<div class="top">
  <div class="badge"><i></i>${p.typ === "news" ? `News · ${esc(p.region || "Z kraju")}` : esc(p.etykieta || "Czy wiesz, że…")}</div>
  <h1>${esc(p.tytul).replace(/\*(.+?)\*/g, "<em>$1</em>")}</h1>
  ${p.zrodlo ? `<div class="zr">Źródło: ${esc(p.zrodlo)}</div>` : ""}
</div>
<div class="logo"><i></i>@${KONTO}</div>
</body></html>`;

// jeden napis (kilka słów)
const napis = (slowa, pal) => `<!doctype html><html><head><meta charset="utf-8">${CSS}<style>
:root{--ak:${pal.akcent}}
.n{position:absolute;left:70px;right:150px;top:1060px;text-align:center;
  font:900 84px/1.08 'Inter Tight';letter-spacing:-.02em;
  -webkit-text-stroke:3px rgba(0,0,0,.85);paint-order:stroke fill;text-shadow:0 6px 30px rgba(0,0,0,.7)}
.n em{background:var(--ak);color:#0B0B10;-webkit-text-stroke:0;text-shadow:none;padding:0 12px;border-radius:14px;
  box-decoration-break:clone;-webkit-box-decoration-break:clone}
</style></head><body><div class="n">${slowa
  .map((w, i, a) => (w.wyr && !a[i - 1]?.wyr ? "<em>" : "") + esc(w.s) + (w.wyr && !a[i + 1]?.wyr ? "</em>" : ""))
  .join(" ")}</div></body></html>`;

// dzieli słowa lektora na krótkie napisy (2–4 słowa)
function grupuj(slowa, wyroznione) {
  const grupy = [];
  let g = [];
  const zamknij = () => { if (g.length) grupy.push(g); g = []; };
  slowa.forEach((w, i) => {
    const nast = slowa[i + 1];
    g.push({ ...w, wyr: wyroznione.has(norm(w.s)) });
    const znaki = g.reduce((a, x) => a + x.s.length + 1, 0);
    const pauza = nast ? nast.t - (w.t + w.d) > 0.18 : true;
    if (pauza || g.length >= 4 || znaki > 20) zamknij();
  });
  zamknij();
  return grupy.map((g, i) => ({
    slowa: g,
    od: g[0].t,
    do: grupy[i + 1] ? grupy[i + 1][0].t : g.at(-1).t + g.at(-1).d + 0.3,
  }));
}

const browser = await puppeteer.launch({ executablePath: BROWSER, headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
async function png(html, plik) {
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: plik, omitBackground: true });
}

for (const p of doZrobienia) {
  const nr = nr3(p.id);
  const foto = `zdjecia/${nr}.jpg`;
  if (!fs.existsSync(foto)) { console.log(`post ${p.id}: brak zdjęcia – pomijam`); continue; }
  const lista = p.typ === "news" ? PALETY_NEWS : PALETY;
  const pal = lista[(((p.id - 1) % lista.length) + lista.length) % lista.length];
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });

  // 1. lektor
  const zaj = czysty(p.zajawka || p.tytul);
  const wstep = p.hak ? czysty(p.hak)
    : p.typ === "news" ? zaj
    : p.etykieta ? `${czysty(p.tytul)}. ${zaj}`
    : `Czy wiesz, że ${zaj[0].toLowerCase()}${zaj.slice(1)}?`;
  const koniec = p.typ === "news" ? "Obserwuj kropkę wiedzy, żeby nic Cię nie ominęło." : "Obserwuj kropkę wiedzy po więcej ciekawostek.";
  const tekst = `${wstep}. ${czysty(p.tekst)} ${koniec}`.replace(/([.?!])\./g, "$1");
  fs.writeFileSync(`${TMP}/tekst.txt`, tekst);
  execFileSync(PYTHON, ["tiktok/lektor.py", `${TMP}/tekst.txt`, `${TMP}/glos.mp3`, `${TMP}/slowa.json`, GLOS], { stdio: "inherit" });
  const slowa = JSON.parse(fs.readFileSync(`${TMP}/slowa.json`, "utf8"));
  if (!slowa.length) { console.log(`post ${p.id}: lektor nie zwrócił słów – pomijam`); continue; }

  // słowa wyróżnione w tekście (*...* i **...**) dostają kolor
  const wyroznione = new Set();
  for (const m of `${p.zajawka || ""} ${p.tekst}`.matchAll(/\*+(.+?)\*+/g))
    m[1].split(/\s+/).map(norm).filter((w) => w.length > 2 || /\d/.test(w)).forEach((w) => wyroznione.add(w));

  const grupy = grupuj(slowa, wyroznione);
  const dlugosc = grupy.at(-1).do + 0.6;

  // 2. grafiki
  await png(warstwa(p, pal), `${TMP}/warstwa.png`);
  for (const [i, g] of grupy.entries()) await png(napis(g.slowa, pal), `${TMP}/n${i}.png`);

  // 3. składanie filmu
  const wejscia = ["-loop", "1", "-framerate", String(FPS), "-i", foto, "-i", `${TMP}/warstwa.png`];
  grupy.forEach((_, i) => wejscia.push("-i", `${TMP}/n${i}.png`));
  wejscia.push("-i", `${TMP}/glos.mp3`);
  const klatki = Math.ceil(dlugosc * FPS);
  let f = `[0:v]scale=${W * 2}:${H * 2}:force_original_aspect_ratio=increase,crop=${W * 2}:${H * 2},` +
    `zoompan=z='1+0.18*on/${klatki}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${W}x${H}:fps=${FPS},` +
    `eq=brightness=-0.04:saturation=1.1[t0];[t0][1:v]overlay=0:0[t1]`;
  grupy.forEach((g, i) => {
    f += `;[t${i + 1}][${i + 2}:v]overlay=0:0:enable='between(t,${g.od.toFixed(3)},${(g.do - 0.001).toFixed(3)})'[t${i + 2}]`;
  });
  const audio = grupy.length + 2;
  const wynik = `tiktok/filmy/${nr}.mp4`;
  execFileSync(FFMPEG, [
    "-y", "-loglevel", "error", ...wejscia,
    "-filter_complex", f, "-map", `[t${grupy.length + 1}]`, "-map", `${audio}:a`,
    "-t", dlugosc.toFixed(2), "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "160k", "-af", "apad", "-movflags", "+faststart", wynik,
  ], { stdio: "inherit" });
  console.log(`post ${p.id}: film gotowy (${dlugosc.toFixed(0)} s) -> ${wynik}`);
}
await browser.close();
fs.rmSync(TMP, { recursive: true, force: true });
