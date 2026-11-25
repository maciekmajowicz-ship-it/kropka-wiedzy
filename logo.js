// Generuje logo: node logo.js  -> folder logo/
import fs from "node:fs";
import puppeteer from "puppeteer-core";
import { czcionka } from "./szablon.js";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const FONTS =
  czcionka("inter-tight", "Inter Tight") + czcionka("unbounded", "Unbounded") + czcionka("inter", "Inter");
const LIME = "#C6FF3D";

const strona = (w, h, body, css = "") => `<!doctype html><html><head><meta charset="utf-8">
<style>${FONTS}</style><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${w}px;height:${h}px;overflow:hidden;background:#0B0B10;color:#fff}
.s{position:relative;width:${w}px;height:${h}px;overflow:hidden;display:flex;align-items:center;justify-content:center}
.blob{position:absolute;border-radius:50%;filter:blur(120px)}
.dot{display:inline-block;border-radius:50%;background:${LIME};box-shadow:0 0 60px ${LIME}aa}
${css}</style></head><body>${body}</body></html>`;

const tlo = `<div class="blob" style="width:70%;height:70%;background:#5B2EFF;top:-25%;left:-20%;opacity:.8"></div>
<div class="blob" style="width:60%;height:60%;background:#00C2FF;bottom:-25%;right:-20%;opacity:.55"></div>`;

const pliki = {
  // --- zdjęcia profilowe 1080x1080 (Instagram tnie do kółka) ---
  "profil_A.png": strona(1080, 1080,
    `<div class="s">${tlo}<div class="m">k<span class="dot"></span></div></div>`,
    `.m{position:relative;font-family:'Inter Tight';font-weight:900;font-size:560px;letter-spacing:-.04em;line-height:1;display:flex;align-items:flex-end;margin-top:-40px}
     .m .dot{width:130px;height:130px;margin:0 0 30px 48px}`),

  "profil_B.png": strona(1080, 1080,
    `<div class="s">${tlo}<div class="m">kw<span class="dot"></span></div></div>`,
    `.m{position:relative;font-family:'Unbounded';font-weight:800;font-size:330px;letter-spacing:-.03em;line-height:1;display:flex;align-items:flex-end}
     .m .dot{width:92px;height:92px;margin:0 0 16px 16px}`),

  "profil_C.png": strona(1080, 1080,
    `<div class="s" style="background:${LIME}"><div class="m">k<span class="d"></span></div></div>`,
    `.m{font-family:'Inter Tight';font-weight:900;font-size:600px;letter-spacing:-.04em;line-height:1;color:#0B0B10;display:flex;align-items:flex-end;margin-top:-40px}
     .m .d{width:140px;height:140px;border-radius:50%;background:#5B2EFF;margin:0 0 32px 48px}`),

  // --- napis (okładka Facebooka 1640x856) ---
  "okladka_A.png": strona(1640, 856,
    `<div class="s">${tlo}<div class="w"><div class="n">kropka<span class="dot"></span>wiedzy</div><div class="t">Codzienna dawka ciekawostek</div></div></div>`,
    `.w{position:relative;text-align:center}
     .n{font-family:'Inter Tight';font-weight:900;font-size:190px;letter-spacing:-.04em;line-height:1;display:flex;align-items:flex-end}
     .n .dot{width:46px;height:46px;margin:0 10px 14px 12px}
     .t{font-family:Inter;font-weight:500;font-size:44px;color:rgba(255,255,255,.7);margin-top:36px;letter-spacing:.01em}`),

  "okladka_B.png": strona(1640, 856,
    `<div class="s">${tlo}<div class="w"><div class="n">kropka<span class="dot"></span>wiedzy</div><div class="t">CODZIENNA DAWKA CIEKAWOSTEK</div></div></div>`,
    `.w{position:relative;text-align:center}
     .n{font-family:'Unbounded';font-weight:800;font-size:130px;letter-spacing:-.03em;line-height:1;display:flex;align-items:flex-end}
     .n .dot{width:38px;height:38px;margin:0 12px 8px 12px}
     .t{font-family:Inter;font-weight:700;font-size:32px;color:${LIME};margin-top:44px;letter-spacing:.3em}`),
};

fs.mkdirSync("logo", { recursive: true });
const browser = await puppeteer.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage();
for (const [plik, html] of Object.entries(pliki)) {
  const [w, h] = plik.startsWith("profil") ? [1080, 1080] : [1640, 856];
  await page.setViewport({ width: w, height: h });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `logo/${plik}` });
  console.log(plik);
}
await browser.close();
