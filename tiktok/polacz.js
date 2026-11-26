// Podłączenie konta TikTok (robi się raz).
//   node tiktok/polacz.js        -> otwiera stronę logowania TikTok
//   node tiktok/polacz.js KOD    -> zamienia kod na token i zapisuje go w .env i GitHub Secrets
import fs from "node:fs";
import { execSync } from "node:child_process";

const REDIRECT = "https://maciekmajowicz-ship-it.github.io/kropka-wiedzy/";
let env = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "";
const cfg = (k) => (env.match(new RegExp(`^${k}=(.+)$`, "m")) || [])[1]?.trim();
const KEY = cfg("TIKTOK_CLIENT_KEY"), SECRET = cfg("TIKTOK_CLIENT_SECRET");
if (!KEY || !SECRET) { console.error("Brak TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET w .env"); process.exit(1); }

const kod = process.argv[2];
if (!kod) {
  const url = "https://www.tiktok.com/v2/auth/authorize/?" + new URLSearchParams({
    client_key: KEY, response_type: "code", scope: process.env.SCOPE || "user.info.basic,video.upload",
    redirect_uri: REDIRECT, state: "kropka",
  });
  console.log(url);
  execSync(process.platform === "win32" ? `start "" "${url}"` : `xdg-open "${url}"`);
  process.exit(0);
}

const r = await (await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ client_key: KEY, client_secret: SECRET, code: decodeURIComponent(kod.trim()), grant_type: "authorization_code", redirect_uri: REDIRECT }),
})).json();
if (!r.refresh_token) { console.error("Nie udało się:", r); process.exit(1); }

const ustaw = (k, v) => { env = env.match(new RegExp(`^${k}=`, "m")) ? env.replace(new RegExp(`^${k}=.*$`, "m"), `${k}=${v}`) : env.replace(/\n?$/, `\n${k}=${v}\n`); };
ustaw("TIKTOK_REFRESH_TOKEN", r.refresh_token);
fs.writeFileSync(".env", env);
for (const [k, v] of [["TIKTOK_CLIENT_KEY", KEY], ["TIKTOK_CLIENT_SECRET", SECRET], ["TIKTOK_REFRESH_TOKEN", r.refresh_token]])
  execSync(`gh secret set ${k}`, { input: v });
console.log(`Połączono! Uprawnienia: ${r.scope}. Token zapisany w .env i w GitHub Secrets.`);
