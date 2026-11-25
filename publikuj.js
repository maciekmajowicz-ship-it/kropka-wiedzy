// Publikuje posty (karuzela 2 zdjęć) na Instagramie i – jeśli skonfigurowano – na Facebooku.
// Wymaga: IG_TOKEN, IG_USER_ID, BASE_URL (publiczny adres folderu output/); opcjonalnie FB_PAGE_ID + FB_PAGE_TOKEN
//   node publikuj.js --auto     -> harmonogram: ciekawostka o 10, 13, 16, 19 i 22 (czas PL)
//   node publikuj.js --newsy    -> od razu publikuje świeże, jeszcze nieopublikowane newsy
//   node publikuj.js            -> od razu publikuje następną ciekawostkę
//   node publikuj.js --id 0     -> publikuje konkretny post
//   dowolne z powyższych + --test  -> tylko pokazuje, co by opublikował
import fs from "node:fs";

const env = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "";
const cfg = (k) => process.env[k] || (env.match(new RegExp(`^${k}=(.+)$`, "m")) || [])[1]?.trim();
const TOKEN = cfg("IG_TOKEN");
const IG = cfg("IG_USER_ID");
const BASE = cfg("BASE_URL");
const FB_PAGE = cfg("FB_PAGE_ID");
const FB_TOKEN = cfg("FB_PAGE_TOKEN");
const args = process.argv.slice(2);
const TEST = args.includes("--test");
const API = "https://graph.facebook.com/v23.0";

const GODZINY_CIEKAWOSTEK = [10, 13, 16, 19, 22];
const MAX_NEWSOW_DZIENNIE = 6;
const HASHTAGI_FAKT = "#ciekawostki #czywiesz #wiedza #ciekawostka #faktyciekawostki #nauka #kropkawiedzy";
const HASHTAGI_NEWS = "#wiadomosci #news #polska #swiat #informacje #kropkawiedzy";

const posts = JSON.parse(fs.readFileSync("posts.json", "utf8"));
const nr3 = (id) => String(id).padStart(3, "0");
const bezGwiazdek = (s) => s.replace(/\*+/g, "");

// stan: każdy opublikowany post ma swój plik opublikowane/NNN.json
const STAN = "opublikowane";
fs.mkdirSync(STAN, { recursive: true });
const opublikowane = fs.readdirSync(STAN).filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(fs.readFileSync(`${STAN}/${f}`, "utf8")));

const teraz = new Date();
const czasPL = (d, o) => new Date(d).toLocaleString("sv-SE", { timeZone: "Europe/Warsaw", ...o });
const dzienPL = (d) => czasPL(d, { year: "numeric", month: "2-digit", day: "2-digit" });
const dzis = dzienPL(teraz);
const godz = Number(czasPL(teraz, { hour: "2-digit", hour12: false }));

const gotowy = (p) =>
  !opublikowane.some((o) => o.id === p.id) && fs.existsSync(`output/${nr3(p.id)}_1.jpg`);
const dniTemu = (d) => (new Date(dzis) - new Date(d)) / 86400000;
const czyNews = (p) => p.typ === "news";
const czyFakt = (p) => !p.typ || p.typ === "fakt";

let doPublikacji = [];
let slot = null;
if (args.includes("--id")) {
  const id = Number(args[args.indexOf("--id") + 1]);
  const p = posts.find((x) => x.id === id);
  if (!p) throw new Error(`Nie ma posta o id ${id}`);
  doPublikacji = [p];
} else if (args.includes("--newsy")) {
  const dzisNewsow = opublikowane.filter((o) => o.typ === "news" && dzienPL(o.data) === dzis).length;
  doPublikacji = posts
    .filter((p) => czyNews(p) && gotowy(p) && p.data && dniTemu(p.data) <= 1)
    .slice(0, Math.max(0, MAX_NEWSOW_DZIENNIE - dzisNewsow));
} else if (args.includes("--auto")) {
  if (!GODZINY_CIEKAWOSTEK.includes(godz)) {
    console.log(`W Polsce jest ${godz}:xx – to nie jest godzina ciekawostki, pomijam.`);
    process.exit(0);
  }
  slot = `${dzis} ${godz}`;
  if (opublikowane.some((o) => o.slot === slot)) { console.log(`Ciekawostka na ${godz}:00 już wyszła – pomijam.`); process.exit(0); }
  doPublikacji = [posts.find((p) => czyFakt(p) && gotowy(p))].filter(Boolean);
} else {
  doPublikacji = [posts.find((p) => czyFakt(p) && gotowy(p))].filter(Boolean);
}
if (!doPublikacji.length) { console.log("Nic do opublikowania."); process.exit(0); }

function opis(post) {
  if (post.opis) return post.opis;
  if (czyNews(post))
    return `${bezGwiazdek(post.zajawka)} 📰\n\n👉 Przesuń, żeby poznać szczegóły.\n\n` +
      (post.zrodlo ? `Źródło: ${post.zrodlo}\n\n` : "") +
      `Obserwuj @kropka.wiedzy, żeby być na bieżąco.\n\n${HASHTAGI_NEWS}`;
  const glowa = post.etykieta
    ? bezGwiazdek(post.zajawka)
    : `Czy wiesz, że ${bezGwiazdek(post.zajawka).replace(/^./, (c) => c.toLowerCase())}?`;
  return `${glowa} 🤯\n\n👉 Przesuń, żeby poznać szczegóły!\n🔖 Zapisz, żeby nie zapomnieć, i wyślij komuś, kto powinien to wiedzieć.\n\n` +
    `Codziennie nowe ciekawostki – obserwuj @kropka.wiedzy\n\n${HASHTAGI_FAKT}`;
}

async function api(sciezka, params, method = "POST", token = TOKEN) {
  const body = new URLSearchParams({ ...params, access_token: token });
  const res = await fetch(
    method === "GET" ? `${API}/${sciezka}?${body}` : `${API}/${sciezka}`,
    method === "GET" ? {} : { method, body }
  );
  const json = await res.json();
  if (json.error) throw new Error(`${sciezka}: ${json.error.message}`);
  return json;
}

async function czekaj(id) {
  for (let i = 0; i < 30; i++) {
    const { status_code } = await api(id, { fields: "status_code" }, "GET");
    if (status_code === "FINISHED") return;
    if (status_code === "ERROR") throw new Error(`Instagram odrzucił kontener ${id}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error("Instagram zbyt długo przetwarza zdjęcia");
}

async function instagram(zdjecia, tekst) {
  const dzieci = [];
  for (const url of zdjecia) {
    const { id } = await api(`${IG}/media`, { image_url: url, is_carousel_item: "true" });
    await czekaj(id);
    dzieci.push(id);
  }
  const { id: karuzela } = await api(`${IG}/media`, { media_type: "CAROUSEL", children: dzieci.join(","), caption: tekst });
  await czekaj(karuzela);
  const { id } = await api(`${IG}/media_publish`, { creation_id: karuzela });
  return id;
}

async function facebook(zdjecia, tekst) {
  const ids = [];
  for (const url of zdjecia) {
    const { id } = await api(`${FB_PAGE}/photos`, { url, published: "false" }, "POST", FB_TOKEN);
    ids.push(id);
  }
  const params = { message: tekst };
  ids.forEach((id, i) => (params[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id })));
  const { id } = await api(`${FB_PAGE}/feed`, params, "POST", FB_TOKEN);
  return id;
}

for (const post of doPublikacji) {
  const zdjecia = [1, 2].map((n) => `${(BASE || "<BASE_URL>").replace(/\/$/, "")}/${nr3(post.id)}_${n}.jpg`);
  const tekst = opis(post);
  console.log(`Post ${post.id} (${post.typ || "fakt"}): ${bezGwiazdek(post.zajawka)}\n${zdjecia.join("\n")}\n---\n${tekst}\n---`);
  if (TEST) continue;
  if (!TOKEN || !IG || !BASE) throw new Error("Brak IG_TOKEN, IG_USER_ID lub BASE_URL");

  const media = await instagram(zdjecia, tekst);
  console.log(`✅ Instagram: post ${post.id} (media ${media})`);

  let fb = null;
  if (FB_PAGE && FB_TOKEN) {
    try {
      fb = await facebook(zdjecia, tekst.replace(/@kropka\.wiedzy/g, "Kropka Wiedzy"));
      console.log(`✅ Facebook: post ${post.id} (${fb})`);
    } catch (e) {
      console.log(`⚠️ Facebook nie przyjął posta ${post.id}: ${e.message}`);
    }
  }

  const wpis = { id: post.id, typ: post.typ || "fakt", media, fb, data: new Date().toISOString(), ...(slot && { slot }) };
  fs.writeFileSync(`${STAN}/${nr3(post.id)}.json`, JSON.stringify(wpis, null, 2));
}
