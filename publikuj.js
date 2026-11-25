// Publikuje kolejny nieopublikowany post (karuzela 2 zdjęć) na Instagramie.
// Wymaga zmiennych: IG_TOKEN, IG_USER_ID, BASE_URL (publiczny adres folderu output/)
// Użycie: node publikuj.js          -> publikuje następny post
//         node publikuj.js --test   -> tylko pokazuje, co by opublikował
import fs from "node:fs";

const env = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "";
const cfg = (k) => process.env[k] || (env.match(new RegExp(`^${k}=(.+)$`, "m")) || [])[1]?.trim();
const TOKEN = cfg("IG_TOKEN");
const IG = cfg("IG_USER_ID");
const BASE = cfg("BASE_URL");
const TEST = process.argv.includes("--test");
const API = "https://graph.facebook.com/v23.0";

const HASHTAGI = "#ciekawostki #czywiesz #wiedza #ciekawostka #faktyciekawostki #nauka #polska #kropkawiedzy";

const posts = JSON.parse(fs.readFileSync("posts.json", "utf8"));
const STAN = "opublikowane.json";
const opublikowane = fs.existsSync(STAN) ? JSON.parse(fs.readFileSync(STAN, "utf8")) : [];
const nr3 = (id) => String(id).padStart(3, "0");

// harmonogram (GitHub) wywołuje skrypt z --auto: publikuj tylko o 18 czasu polskiego i raz dziennie
if (process.argv.includes("--auto")) {
  const teraz = new Date();
  const godz = Number(teraz.toLocaleString("en-GB", { timeZone: "Europe/Warsaw", hour: "2-digit", hour12: false }));
  const dzis = teraz.toLocaleDateString("sv-SE", { timeZone: "Europe/Warsaw" });
  const ostatni = opublikowane.at(-1);
  const ostatniDzien = ostatni && new Date(ostatni.data).toLocaleDateString("sv-SE", { timeZone: "Europe/Warsaw" });
  if (godz !== 18) { console.log(`Teraz jest ${godz}:00 w Polsce – publikacja o 18:00, pomijam.`); process.exit(0); }
  if (ostatniDzien === dzis) { console.log("Dziś już był post – pomijam."); process.exit(0); }
}

const post = posts.find(
  (p) => !opublikowane.some((o) => o.id === p.id) && fs.existsSync(`output/${nr3(p.id)}_1.jpg`)
);
if (!post) {
  console.log("Brak nowych postów do opublikowania – dodaj kolejne ciekawostki!");
  process.exit(0);
}

const bezGwiazdek = (s) => s.replace(/\*+/g, "");
const opis =
  post.opis ||
  `Czy wiesz, że ${bezGwiazdek(post.zajawka).replace(/^./, (c) => c.toLowerCase())}? 🤯\n\n` +
    `👉 Przesuń, żeby poznać szczegóły!\n🔖 Zapisz, żeby nie zapomnieć, i wyślij komuś, kto powinien to wiedzieć.\n\n` +
    `Codziennie nowa ciekawostka – obserwuj @kropka.wiedzy\n\n${HASHTAGI}`;

const zdjecia = [1, 2].map((n) => `${(BASE || "<BASE_URL>").replace(/\/$/, "")}/${nr3(post.id)}_${n}.jpg`);
console.log(`Post ${post.id}: ${bezGwiazdek(post.zajawka)}\n${zdjecia.join("\n")}\n---\n${opis}\n---`);
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

opublikowane.push({ id: post.id, media, data: new Date().toISOString() });
fs.writeFileSync(STAN, JSON.stringify(opublikowane, null, 2));
console.log(`✅ Opublikowano post ${post.id} (media ${media})`);
