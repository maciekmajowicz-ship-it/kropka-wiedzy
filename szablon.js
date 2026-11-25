// Szablony HTML slajdów. Renderowane do JPG przez render.js
import fs from "node:fs";
import path from "node:path";

// czcionki wbudowane lokalnie (bez internetu)
export function czcionka(pkg, nazwa) {
  const dir = path.join("node_modules", "@fontsource-variable", pkg);
  return fs
    .readFileSync(path.join(dir, "index.css"), "utf8")
    .replace(/font-family: '[^']+'/g, `font-family: '${nazwa}'`)
    .replace(/url\(\.\/files\/([^)]+)\)/g, (_, f) =>
      `url(data:font/woff2;base64,${fs.readFileSync(path.join(dir, "files", f)).toString("base64")})`
    );
}
const FONTS = czcionka("inter", "Inter") + czcionka("inter-tight", "Inter Tight");

export const KONTO = "kropka.wiedzy"; // <- nazwa konta (bez @)

export const PALETY = [
  { akcent: "#C6FF3D", a: "#5B2EFF", b: "#00C2FF" },
  { akcent: "#FF5C93", a: "#FF7A00", b: "#8A2BE2" },
  { akcent: "#3DF5FF", a: "#0057FF", b: "#00C48C" },
  { akcent: "#FFD23D", a: "#FF3D3D", b: "#FF8A00" },
  { akcent: "#B9A2FF", a: "#3D5AFE", b: "#E040FB" },
];

const MIES = ["stycznia","lutego","marca","kwietnia","maja","czerwca","lipca","sierpnia","września","października","listopada","grudnia"];
const dataPL = (d) => {
  if (!d) return "";
  const [r, m, dz] = d.split("-").map(Number);
  return `${dz} ${MIES[m - 1]} ${r}`;
};

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// *słowo* -> wyróżnienie kolorem, **słowo** -> pogrubienie
const fmt = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .split(/\n\s*\n/)
    .map((p) => `<p>${p}</p>`)
    .join("");

const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

const baza = (p, body) => `<!doctype html><html><head><meta charset="utf-8">
<style>${FONTS}</style>
<style>
:root{--ak:${p.akcent};--a:${p.a};--b:${p.b}}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px;overflow:hidden;background:#0B0B10;color:#fff;font-family:Inter,sans-serif}
.slide{position:relative;width:1080px;height:1350px;overflow:hidden}
.blob{position:absolute;border-radius:50%;filter:blur(110px);opacity:.85}
.grain{position:absolute;inset:0;background-image:${GRAIN};opacity:.13;mix-blend-mode:overlay;pointer-events:none}
.top{position:absolute;top:64px;left:72px;right:72px;display:flex;justify-content:space-between;align-items:center;z-index:5}
.logo{display:flex;align-items:center;gap:14px;font-family:'Inter Tight';font-weight:800;font-size:32px;letter-spacing:-.01em}
.logo i{width:22px;height:22px;border-radius:50%;background:var(--ak);box-shadow:0 0 24px var(--ak)}
.chip{padding:14px 26px;border-radius:100px;background:rgba(255,255,255,.1);border:1.5px solid rgba(255,255,255,.22);backdrop-filter:blur(20px);font-weight:600;font-size:26px;letter-spacing:.02em}
em{font-style:normal;color:var(--ak)}
</style></head><body>${body}</body></html>`;

// Tło slajdu: zdjęcie z kolorową winietą albo (gdy brak zdjęcia) kolorowe poświaty + emoji
function tlo1(post, foto) {
  if (!foto)
    return `<div class="blob" style="width:760px;height:760px;background:var(--a);top:-160px;left:-200px"></div>
  <div class="blob" style="width:680px;height:680px;background:var(--b);top:180px;right:-260px;opacity:.7"></div>
  <div class="emoji">${post.emoji || "💡"}</div>`;
  return `<img class="ph" src="${foto}">
  <div class="tint"></div><div class="vig"></div>`;
}

export function slajd1(post, pal, foto) {
  return baza(
    pal,
    `<div class="slide">
  ${tlo1(post, foto)}
  <div class="shade"></div>
  <div class="grain"></div>
  <div class="top"><div class="logo"><i></i>${KONTO}</div></div>
  <div class="bottom">
    <div class="label">${post.etykieta ? esc(post.etykieta) : post.typ === "news" ? `${esc(post.region || "Z kraju")}<span class="dt">${esc(dataPL(post.data))}</span>` : "Czy wiesz, że…"}</div>
    <h1 id="fit">${fmt(post.zajawka)}</h1>
    <div class="foot">
      <div class="bars"><span class="on"></span><span></span></div>
      <div class="swipe">Przesuń <span>→</span></div>
    </div>
  </div>
</div>
<style>
.ph{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(1.12) contrast(1.06)}
.tint{position:absolute;inset:0;background:
  linear-gradient(180deg,color-mix(in srgb,var(--a) 55%,transparent) 0%,transparent 22%),
  linear-gradient(90deg,color-mix(in srgb,var(--a) 35%,transparent) 0%,transparent 30%,transparent 70%,color-mix(in srgb,var(--b) 35%,transparent) 100%);
  mix-blend-mode:hard-light}
.vig{position:absolute;inset:0;background:radial-gradient(ellipse 85% 70% at 50% 38%,transparent 40%,rgba(5,5,10,.65) 100%)}
.emoji{position:absolute;top:170px;left:50%;transform:translateX(-50%) rotate(-8deg);font-size:430px;line-height:1;filter:drop-shadow(0 40px 60px rgba(0,0,0,.45));z-index:2}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,11,16,0) 38%,rgba(11,11,16,.72) 58%,rgba(11,11,16,.96) 76%,#0B0B10 100%);z-index:3}
.bottom{position:absolute;left:72px;right:72px;bottom:72px;z-index:5}
.label{display:inline-block;font-weight:700;font-size:28px;letter-spacing:.22em;text-transform:uppercase;color:#0B0B10;background:var(--ak);padding:10px 20px;border-radius:10px;margin-bottom:30px}
h1{font-family:'Inter Tight';font-weight:900;font-size:96px;line-height:1.02;letter-spacing:-.025em;word-spacing:.06em;max-height:400px;text-shadow:0 4px 30px rgba(0,0,0,.5)}
.foot{display:flex;justify-content:space-between;align-items:center;margin-top:52px}
.bars{display:flex;gap:10px}.bars span{width:64px;height:7px;border-radius:4px;background:rgba(255,255,255,.25)}.bars .on{background:#fff}
.swipe{font-weight:600;font-size:28px;color:rgba(255,255,255,.85)}.swipe span{color:var(--ak);font-size:34px;margin-left:8px}
.top .logo{text-shadow:0 2px 16px rgba(0,0,0,.6)}
.label .dt{margin-left:18px;padding-left:18px;border-left:3px solid rgba(11,11,16,.35);letter-spacing:.08em}
</style>`
  );
}

export function slajd2(post, pal, foto) {
  const tlo = foto
    ? `<img class="ph2" src="${foto}"><div class="dim"></div>`
    : "";
  return baza(
    pal,
    `<div class="slide">
  ${tlo}
  <div class="blob" style="width:620px;height:620px;background:var(--a);top:-330px;right:-200px;opacity:.55"></div>
  <div class="blob" style="width:420px;height:420px;background:var(--b);bottom:-300px;left:-160px;opacity:.35"></div>
  <div class="grain"></div>
  <div class="top"><div class="logo"><i></i>${KONTO}</div></div>
  <div class="content">
    <h2>${esc(post.tytul)}</h2>
    <div class="line"></div>
    <div class="txt" id="fit">${fmt(post.tekst)}</div>
    ${post.zrodlo ? `<div class="src">Źródło: ${esc(post.zrodlo)}</div>` : ""}
  </div>
  <div class="foot">
    <div class="bars"><span></span><span class="on"></span></div>
    <div class="cta"><span>🔖 Zapisz</span><span>↗ Wyślij znajomemu</span></div>
  </div>
</div>
<style>
.ph2{position:absolute;inset:-80px;width:calc(100% + 160px);height:calc(100% + 160px);object-fit:cover;filter:blur(36px) saturate(1.3)}
.dim{position:absolute;inset:0;background:rgba(11,11,16,.78)}
.content{position:absolute;top:200px;left:72px;right:72px;bottom:190px;display:flex;flex-direction:column;z-index:5}
h2{font-family:'Inter Tight';font-weight:800;font-size:72px;line-height:1.02;letter-spacing:-.03em}
.line{width:90px;height:8px;border-radius:4px;background:var(--ak);margin:36px 0 40px;box-shadow:0 0 20px var(--ak)}
.txt{font-size:46px;line-height:1.48;color:rgba(255,255,255,.8);font-weight:400;flex:1;min-height:0;overflow:hidden}
.txt p+p{margin-top:28px}
.src{margin-top:24px;font-size:24px;font-weight:500;color:rgba(255,255,255,.5)}
.txt b{color:#fff;font-weight:700;background:linear-gradient(transparent 62%,color-mix(in srgb,var(--ak) 40%,transparent) 62%)}
.foot{position:absolute;left:72px;right:72px;bottom:72px;display:flex;justify-content:space-between;align-items:center;z-index:5}
.bars{display:flex;gap:10px}.bars span{width:64px;height:7px;border-radius:4px;background:rgba(255,255,255,.25)}.bars .on{background:#fff}
.cta{display:flex;gap:14px}.cta span{padding:14px 24px;border-radius:100px;background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.16);font-weight:600;font-size:25px}
</style>`
  );
}
