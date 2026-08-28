// Adds "pair.active" right after each "pair.expires" line in src/lib/i18n.ts.
const fs = require("fs");

const f = "src/lib/i18n.ts";
let s = fs.readFileSync(f, "utf8");

const inserts = [
  ['"pair.expires": "Expires in",', '"pair.active": "Active for 24 hours",'],
  ['"pair.expires": "Caduca en",', '"pair.active": "Activo durante 24 horas",'],
  ['"pair.expires": "Expire dans",', '"pair.active": "Actif pendant 24 heures",'],
  ['"pair.expires": "Läuft ab in",', '"pair.active": "24 Stunden aktiv",'],
  ['"pair.expires": "Expira em",', '"pair.active": "Ativo por 24 horas",'],
  ['"pair.expires": "ينتهي خلال",', '"pair.active": "نشط لمدة 24 ساعة",'],
  ['"pair.expires": "Wygasa za",', '"pair.active": "Aktywne przez 24 godziny",'],
  ['"pair.expires": "Scade tra",', '"pair.active": "Attivo per 24 ore",'],
  ['"pair.expires": "Verloopt over",', '"pair.active": "24 uur actief",'],
  ['"pair.expires": "Süre doluyor",', '"pair.active": "24 saat aktif",'],
  ['"pair.expires": "有効期限",', '"pair.active": "24時間アクティブ",'],
  ['"pair.expires": "有效期",', '"pair.active": "24小时有效",'],
];

let count = 0;
for (const [from, to] of inserts) {
  if (s.includes(from)) {
    s = s.split(from).join(from + "\n    " + to);
    count++;
  } else {
    console.log("MISS:", from);
  }
}
fs.writeFileSync(f, s);
console.log("inserted:", count);
