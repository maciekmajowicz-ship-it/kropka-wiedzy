// Generuje slajdy do folderu output/
//   node render.js               -> tylko posty, które nie mają jeszcze grafik
//   node render.js --wszystkie   -> wszystkie posty od nowa (np. po zmianie wyglądu)
//   node render.js 5             -> tylko post o id 5
// Zdjęcie do posta: zdjecia/001.jpg (dla id 1) – pobiera je pobierz_zdjecia.js
import fs from "node:fs";
import puppeteer from "puppeteer-core";
import { slajd1, slajd2, PALETY } from "./szablon.js";

const PRZEGLADARKI = [
  process.env.CHROME_PATH,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
].filter(Boolean);
const BROWSER = PRZEGLADARKI.find((p) => fs.existsSync(p));

const posts = JSON.parse(fs.readFileSync("posts.json", "utf8"));
const arg = process.argv[2];
const wszystkie = arg === "--wszystkie";
const tylko = arg && !wszystkie ? Number(arg) : null;
fs.mkdirSync("output", { recursive: true });

const nr3 = (id) => String(id).padStart(3, "0");

function zdjecie(id) {
  const plik = `zdjecia/${nr3(id)}.jpg`;
  if (!fs.existsSync(plik)) return null;
  return "data:image/jpeg;base64," + fs.readFileSync(plik).toString("base64");
}

// zmniejsza czcionkę elementu #fit, aż tekst zmieści się w ramce
async function dopasuj(page) {
  await page.evaluate(() => {
    const el = document.getElementById("fit");
    if (!el) return;
    let size = parseFloat(getComputedStyle(el).fontSize);
    const limit = el.tagName === "H1" ? 400 : el.clientHeight;
    el.style.overflow = "hidden";
    while (el.scrollHeight > limit + 2 && size > 24) {
      size -= 2;
      el.style.fontSize = size + "px";
    }
  });
}

const doZrobienia = posts.filter((p) => {
  if (tylko !== null) return p.id === tylko;
  if (wszystkie) return true;
  return !fs.existsSync(`output/${nr3(p.id)}_1.jpg`);
});
if (!doZrobienia.length) {
  console.log("Wszystkie posty mają już grafiki.");
  process.exit(0);
}

const browser = await puppeteer.launch({ executablePath: BROWSER, headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });

for (const p of doZrobienia) {
  const pal = PALETY[(((p.id - 1) % PALETY.length) + PALETY.length) % PALETY.length];
  const foto = zdjecie(p.id);
  if (!foto && wszystkie && fs.existsSync(`output/${nr3(p.id)}_1.jpg`)) {
    console.log(`post ${p.id}: brak zdjęcia lokalnie – zostawiam stare grafiki`);
    continue;
  }
  for (const [nr, html] of [[1, slajd1(p, pal, foto)], [2, slajd2(p, pal, foto)]]) {
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await dopasuj(page);
    await page.screenshot({ path: `output/${nr3(p.id)}_${nr}.jpg`, type: "jpeg", quality: 92 });
  }
  console.log(`post ${p.id}: gotowe${foto ? "" : " (bez zdjęcia)"}`);
}
await browser.close();
