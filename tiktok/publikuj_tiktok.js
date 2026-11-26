// Wysyła gotowe filmy z tiktok/filmy/ na TikToka.
//   TIKTOK_TRYB=szkic (domyślnie) -> film trafia do skrzynki w aplikacji TikTok, publikujesz jednym kliknięciem
//   TIKTOK_TRYB=publiczny         -> od razu publikacja z opisem (działa po zatwierdzeniu aplikacji przez TikTok)
// Sekrety: TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REFRESH_TOKEN (w .env albo w GitHub Secrets)
import fs from "node:fs";

const env = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "";
const cfg = (k) => process.env[k] || (env.match(new RegExp(`^${k}=(.+)$`, "m")) || [])[1]?.trim();
const KEY = cfg("TIKTOK_CLIENT_KEY"), SECRET = cfg("TIKTOK_CLIENT_SECRET"), REFRESH = cfg("TIKTOK_REFRESH_TOKEN");
const TRYB = cfg("TIKTOK_TRYB");
if (!TRYB) { console.log("Automatyczna wysyłka na TikToka wyłączona (TIKTOK_TRYB) – filmy są na stronie filmy.html."); process.exit(0); }
const MAX_DZIENNIE = 6;

if (!KEY || !SECRET || !REFRESH) { console.log("TikTok nie jest jeszcze podłączony – pomijam."); process.exit(0); }

const API = "https://open.tiktokapis.com/v2";
const posts = JSON.parse(fs.readFileSync("posts.json", "utf8"));
fs.mkdirSync("tiktok/wyslane", { recursive: true });

const dzis = new Date().toISOString().slice(0, 10);
const wyslaneDzis = fs.readdirSync("tiktok/wyslane").filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(fs.readFileSync(`tiktok/wyslane/${f}`, "utf8")))
  .filter((w) => w.data?.startsWith(dzis)).length;

const filmy = fs.existsSync("tiktok/filmy") ? fs.readdirSync("tiktok/filmy").filter((f) => f.endsWith(".mp4")) : [];
const doWyslania = filmy.filter((f) => !fs.existsSync(`tiktok/wyslane/${f.replace(".mp4", ".json")}`))
  .slice(0, Math.max(0, MAX_DZIENNIE - wyslaneDzis));
if (!doWyslania.length) { console.log("Brak nowych filmów do wysłania na TikToka."); process.exit(0); }

// nowy token dostępu (ważny 24 h) z tokena odświeżania (ważny rok)
const tok = await (await fetch(`${API}/oauth/token/`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ client_key: KEY, client_secret: SECRET, grant_type: "refresh_token", refresh_token: REFRESH }),
})).json();
if (!tok.access_token) { console.error("TikTok: nie udało się odświeżyć tokena", tok); process.exit(1); }
if (tok.refresh_token && tok.refresh_token !== REFRESH)
  console.log("::warning::TikTok dał nowy refresh token – uruchom ponownie tiktok/polacz.js na komputerze.");
const H = { Authorization: `Bearer ${tok.access_token}`, "Content-Type": "application/json; charset=UTF-8" };

const czysty = (s = "") => s.replace(/\*+/g, "").replace(/\s+/g, " ").trim();
const opis = (p) => `${czysty(p.zajawka || p.tytul)} ${p.emoji || ""}\n\nŹródło: ${p.zrodlo || "-"}\n\n#news #wiadomosci #${p.region === "Z POLSKI" ? "polska" : "swiat"} #kropkawiedzy`;

let blad = false;
for (const f of doWyslania) {
  const id = Number(f.slice(0, 3));
  const p = posts.find((x) => x.id === id) || {};
  const plik = fs.readFileSync(`tiktok/filmy/${f}`);
  const source_info = { source: "FILE_UPLOAD", video_size: plik.length, chunk_size: plik.length, total_chunk_count: 1 };
  try {
    let init;
    if (TRYB === "publiczny") {
      const info = await (await fetch(`${API}/post/publish/creator_info/query/`, { method: "POST", headers: H })).json();
      const opcje = info.data?.privacy_level_options || [];
      const privacy = opcje.includes("PUBLIC_TO_EVERYONE") ? "PUBLIC_TO_EVERYONE" : opcje[0] || "SELF_ONLY";
      init = await (await fetch(`${API}/post/publish/video/init/`, {
        method: "POST", headers: H,
        body: JSON.stringify({ post_info: { title: opis(p).slice(0, 2200), privacy_level: privacy, is_aigc: true }, source_info }),
      })).json();
    } else {
      init = await (await fetch(`${API}/post/publish/inbox/video/init/`, {
        method: "POST", headers: H, body: JSON.stringify({ source_info }),
      })).json();
    }
    if (!init.data?.upload_url) throw new Error(JSON.stringify(init.error || init));
    const up = await fetch(init.data.upload_url, {
      method: "PUT",
      headers: { "Content-Type": "video/mp4", "Content-Length": String(plik.length), "Content-Range": `bytes 0-${plik.length - 1}/${plik.length}` },
      body: plik,
    });
    if (!up.ok) throw new Error(`upload ${up.status} ${await up.text()}`);
    fs.writeFileSync(`tiktok/wyslane/${f.replace(".mp4", ".json")}`,
      JSON.stringify({ id, tryb: TRYB, publish_id: init.data.publish_id, data: new Date().toISOString() }, null, 2));
    console.log(`TikTok: film ${f} wysłany (${TRYB === "szkic" ? "do skrzynki – otwórz TikToka i opublikuj" : "publikacja"})`);
  } catch (e) {
    blad = true;
    console.error(`TikTok: błąd przy ${f}: ${e.message}`);
  }
}
if (blad) process.exit(1);
