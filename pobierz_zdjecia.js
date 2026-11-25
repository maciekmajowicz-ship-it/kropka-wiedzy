// Pobiera zdjęcia z Pixabay (darmowe, można używać komercyjnie, bez obowiązku podpisu).
// Klucz API w pliku .env:  PIXABAY_KEY=twój_klucz
// Użycie: node pobierz_zdjecia.js        (pobiera brakujące zdjęcia)
//         node pobierz_zdjecia.js 5 2    (post 5, weź 2. wynik – gdy pierwsze zdjęcie nie pasuje)
import fs from "node:fs";

const env = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "";
const KEY = process.env.PIXABAY_KEY || (env.match(/PIXABAY_KEY=(.+)/) || [])[1]?.trim();
if (!KEY) {
  console.error("Brak klucza – dodaj PIXABAY_KEY=... do pliku .env");
  process.exit(1);
}

const posts = JSON.parse(fs.readFileSync("posts.json", "utf8"));
const tylko = process.argv[2] ? Number(process.argv[2]) : null;
const ktory = process.argv[3] ? Number(process.argv[3]) - 1 : 0;
fs.mkdirSync("zdjecia", { recursive: true });

async function szukaj(q, orientacja) {
  const url = `https://pixabay.com/api/?key=${KEY}&q=${encodeURIComponent(q)}` +
    `&image_type=photo&safesearch=true&per_page=20&min_width=1000&orientation=${orientacja}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`błąd Pixabay ${res.status}`);
  return (await res.json()).hits || [];
}

for (const p of posts) {
  if (tylko && p.id !== tylko) continue;
  const nr = String(p.id).padStart(3, "0");
  const plik = `zdjecia/${nr}.jpg`;
  if (!tylko && fs.existsSync(plik)) continue;
  if (!p.zdjecie) { console.log(`post ${p.id}: brak pola "zdjecie"`); continue; }

  try {
    // najpierw pionowe zdjęcia, a jak ich brak – dowolne
    let hits = await szukaj(p.zdjecie, "vertical");
    if (hits.length <= ktory) hits = await szukaj(p.zdjecie, "all");
    const foto = hits[ktory];
    if (!foto) { console.log(`post ${p.id}: nic nie znaleziono dla "${p.zdjecie}"`); continue; }

    const img = await fetch(foto.largeImageURL);
    fs.writeFileSync(plik, Buffer.from(await img.arrayBuffer()));
    fs.writeFileSync(`zdjecia/${nr}.json`, JSON.stringify({ autor: foto.user, link: foto.pageURL, tagi: foto.tags }, null, 2));
    console.log(`post ${p.id}: pobrano (${foto.tags})`);
  } catch (e) {
    console.log(`post ${p.id}: ${e.message}`);
  }
}
