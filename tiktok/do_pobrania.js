// Wrzuca nowe filmy z tiktok/filmy/ do wydania "filmy" na GitHubie i dopisuje je do strony
// https://maciekmajowicz-ship-it.github.io/kropka-wiedzy/filmy.html (pobieranie + opis do skopiowania)
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const REPO = "maciekmajowicz-ship-it/kropka-wiedzy";
const LISTA = "docs/filmy.json";
const posts = [...JSON.parse(fs.readFileSync("posts.json", "utf8")), ...JSON.parse(fs.readFileSync("tiktok/viral.json", "utf8"))];
const lista = fs.existsSync(LISTA) ? JSON.parse(fs.readFileSync(LISTA, "utf8")) : [];
const gh = (...a) => execFileSync("gh", a, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

const czysty = (s = "") => s.replace(/\*+/g, "").replace(/\s+/g, " ").trim();
const opis = (p) => p.typ === "news"
  ? `${czysty(p.zajawka || p.tytul)} ${p.emoji || ""}\n\nŹródło: ${p.zrodlo || "-"}\n\n#news #wiadomosci #${p.region === "Z POLSKI" ? "polska" : "swiat"} #kropkawiedzy #fyp`
  : `${p.hak ? czysty(p.hak) : `${p.etykieta ? czysty(p.tytul) + " – " : "Czy wiesz, że… "}${czysty(p.zajawka || "")}`} ${p.emoji || ""}\n\nObserwuj po więcej ciekawostek!\n\n#ciekawostki #czywiesz #wiedza #ciekawostka #kropkawiedzy #fyp`;

const filmy = fs.existsSync("tiktok/filmy") ? fs.readdirSync("tiktok/filmy").filter((f) => f.endsWith(".mp4")) : [];
const nowe = filmy.filter((f) => !lista.some((x) => x.plik === f) && f.startsWith(process.argv[2] || ""));
if (!nowe.length) { console.log("Brak nowych filmów do strony."); process.exit(0); }

try { gh("release", "view", "filmy", "-R", REPO); }
catch { gh("release", "create", "filmy", "-R", REPO, "-t", "Filmy na TikToka", "-n", "Filmy do pobrania – lista: https://maciekmajowicz-ship-it.github.io/kropka-wiedzy/filmy.html"); }

for (const f of nowe) {
  const id = Number(f.slice(0, 3));
  const p = posts.find((x) => x.id === id) || {};
  gh("release", "upload", "filmy", `tiktok/filmy/${f}`, "--clobber", "-R", REPO);
  lista.unshift({ plik: f, id, tytul: czysty(p.tytul), opis: opis(p), url: `https://github.com/${REPO}/releases/download/filmy/${f}`, data: new Date().toISOString() });
  console.log(`film ${f} -> strona do pobrania`);
}
fs.writeFileSync(LISTA, JSON.stringify(lista.slice(0, 60), null, 2));
