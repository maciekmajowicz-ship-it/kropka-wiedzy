// Publikuje post (karuzela 2 zdjęć) na Instagramie.
// Wymaga: IG_TOKEN, IG_USER_ID, BASE_URL (publiczny adres folderu output/) – z .env albo zmiennych środowiska
//   node publikuj.js --auto     -> harmonogram: publikuje tylko o pełnych godzinach z GODZINY (czas PL)
//   node publikuj.js            -> publikuje od razu następną ciekawostkę
//   node publikuj.js --id 0     -> publikuje konkretny post
//   dowolne z powyższych + --test  -> tylko pokazuje, co by opublikował
import fs from "node:fs";

const env = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "";
const cfg = (k) => process.env[k] || (env.match(new RegExp(`^${k}=(.+)$`, "m")) || [])[1]?.trim();
const TOKEN = cfg("IG_TOKEN");
const IG = cfg("IG_USER_ID");
const BASE = cfg("BASE_URL");
const args = process.argv.slice(2);
const TEST = args.includes("--test");
const API = "https://graph.facebook.com/v23.0";

// godzina (PL) -> rodzaj posta
const GODZINY = { 10: "news", 13: "fakt", 16: "news", 19: "fakt", 22: "fakt" };
const HASHTAGI_FAKT = "#ciekawostki #czywiesz #wiedza #ciekawostka #faktyciekawostki #nauka #kropkawiedzy";
const HASHTAGI_NEWS = "#wiadomosci #news #polska #swiat #informacje #kropkawiedzy";

const posts = JSON.parse(fs.readFileSync("posts.json", "utf8"));
const STAN = "opublikowane.json";
const opublikowane = fs.existsSync(STAN) ? JSON.parse(fs.readFileSync(STAN, "utf8")) : [];
const nr3 = (id) => String(id).padStart(3, "0");
const bezGwiazdek = (s) => s.replace(/\*+/g, "");

const teraz = new Date();
const czasPL = (d, o) => d.toLocaleString("sv-SE", { timeZone: "Europe/Warsaw", ...o });
const dzis = czasPL(teraz, { year: "numeric", month: "2-digit", day: "2-digit" });
const godz = Number(czasPL(teraz, { hour: "2-digit", hour12: false }));

const gotowy = (p) =>
  !opublikowane.some((o) => o.id === p.id) && fs.existsSync(`output/${nr3(p.id)}_1.jpg`);
const dniTemu = (d) => (new Date(dzis) - new Date(d)) / 86400000;

const nastepnyNews = () =>
  posts
    .filter((p) => p.typ === "news" && gotowy(p) && p.data && dniTemu(p.data) <= 1)
    .sort((a, b) => (b.data || "").localeCompare(a.data || ""))[0];
const nastepnyFakt = () => posts.find((p) => (!p.typ || p.typ === "fakt") && gotowy(p));

let post;
let slot = null;
if (args.includes("--id")) {
  const id = Number(args[args.indexOf("--id") + 1]);
  post = posts.find((p) => p.id === id);
  if (!post) throw new Error(`Nie ma posta o id ${id}`);
} else if (args.includes("--auto")) {
  const rodzaj = GODZINY[godz];
  if (!rodzaj) { console.log(`W Polsce jest ${godz}:xx – to nie jest godzina publikacji, pomijam.`); process.exit(0); }
  slot = `${dzis} ${godz}`;
  if (opublikowane.some((o) => o.slot === slot)) { console.log(`Post na ${slot}:00 już wyszedł – pomijam.`); process.exit(0); }
  post = rodzaj === "news" ? nastepnyNews() || nastepnyFakt() : nastepnyFakt() || nastepnyNews();
} else {
  post = nastepnyFakt();
}
if (!post) { console.log("Brak postów do opublikowania – kolejka jest pusta!"); process.exit(0); }

const opis =
  post.opis ||
  (post.typ === "news"
    ? `${bezGwiazdek(post.zajawka)} 📰\n\n👉 Przesuń, żeby poznać szczegóły.\n\n` +
      (post.zrodlo ? `Źródło: ${post.zrodlo}\n\n` : "") +
      `Obserwuj @kropka.wiedzy, żeby być na bieżąco.\n\n${HASHTAGI_NEWS}`
    : `${post.etykieta ? bezGwiazdek(post.zajawka) : `Czy wiesz, że ${bezGwiazdek(post.zajawka).replace(/^./, (c) => c.toLowerCase())}?`} 🤯\n\n` +
      `👉 Przesuń, żeby poznać szczegóły!\n🔖 Zapisz, żeby nie zapomnieć, i wyślij komuś, kto powinien to wiedzieć.\n\n` +
      `Codziennie nowe ciekawostki – obserwuj @kropka.wiedzy\n\n${HASHTAGI_FAKT}`);

const zdjecia = [1, 2].map((n) => `${(BASE || "<BASE_URL>").replace(/\/$/, "")}/${nr3(post.id)}_${n}.jpg`);
console.log(`Post ${post.id} (${post.typ || "fakt"}): ${bezGwiazdek(post.zajawka)}\n${zdjecia.join("\n")}\n---\n${opis}\n---`);
if (TEST) process.exit(0);
if (!TOKEN || !IG || !BASE) throw new Error("Brak IG_TOKEN, IG_USER_ID lub BASE_URL");

async function api(sciezka, params, method = "POST") {
  const body = new URLSearchParams({ ...params, access_token: TOKEN });
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

const dzieci = [];
for (const url of zdjecia) {
  const { id } = await api(`${IG}/media`, { image_url: url, is_carousel_item: "true" });
  await czekaj(id);
  dzieci.push(id);
}
const { id: karuzela } = await api(`${IG}/media`, {
  media_type: "CAROUSEL",
  children: dzieci.join(","),
  caption: opis,
});
await czekaj(karuzela);
const { id: media } = await api(`${IG}/media_publish`, { creation_id: karuzela });

opublikowane.push({ id: post.id, media, data: teraz.toISOString(), ...(slot && { slot }) });
fs.writeFileSync(STAN, JSON.stringify(opublikowane, null, 2));
console.log(`✅ Opublikowano post ${post.id} (media ${media})`);
