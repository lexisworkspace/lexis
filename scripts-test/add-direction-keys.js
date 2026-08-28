// Adds the phone-first direction screen keys to every language in i18n.ts.
const fs = require("fs");
const f = "src/lib/i18n.ts";
let s = fs.readFileSync(f, "utf8");

const keys = {
  "pair.directionTitle": {
    en: "Send your phone's data to this desktop?",
    es: "¿Enviar los datos de tu teléfono a este escritorio?",
    fr: "Envoyer les données de votre téléphone à cet ordinateur ?",
    de: "Daten deines Telefons an diesen Desktop senden?",
    pt: "Enviar os dados do seu telefone para este desktop?",
    ar: "هل تريد إرسال بيانات هاتفك إلى هذا الجهاز؟",
    pl: "Wysłać dane z telefonu na ten komputer?",
    it: "Inviare i dati del telefono a questo desktop?",
    nl: "Gegevens van je telefoon naar deze desktop sturen?",
    tr: "Telefonundaki veriler bu masaüstüne gönderilsin mi?",
    ja: "このデスクトップにスマホのデータを送信しますか？",
    zh: "要把手机数据发送到此桌面吗？",
  },
  "pair.directionDesc": {
    en: "It looks like you already use Lexis on this phone. This desktop is empty - send your workspace here so both devices stay in sync, no account needed.",
    es: "Parece que ya usas Lexis en este teléfono. Este escritorio está vacío: envía tu espacio de trabajo aquí para que ambos dispositivos estén sincronizados, sin necesidad de cuenta.",
    fr: "Vous utilisez déjà Lexis sur ce téléphone. Cet ordinateur est vide : envoyez votre espace de travail ici pour que les deux appareils restent synchronisés, sans compte.",
    de: "Sie nutzen Lexis bereits auf diesem Telefon. Dieser Desktop ist leer: Senden Sie Ihren Arbeitsbereich hierher, damit beide Geräte synchron bleiben - ganz ohne Konto.",
    pt: "Parece que você já usa o Lexis neste telefone. Este desktop está vazio: envie seu espaço de trabalho para cá para que os dois dispositivos fiquem sincronizados, sem precisar de conta.",
    ar: "يبدو أنك تستخدم Lexis بالفعل على هذا الهاتف. هذا الجهاز فارغ - أرسل مساحة عملك هنا ليبقى الجهازان متزامنين دون الحاجة إلى حساب.",
    pl: "Wygląda na to, że już używasz Lexis na tym telefonie. Ten komputer jest pusty - wyślij swój obszar roboczy tutaj, aby oba urządzenia pozostały zsynchronizowane, bez konta.",
    it: "Sembra che tu usi già Lexis su questo telefono. Questo desktop è vuoto: invia qui il tuo spazio di lavoro per tenere sincronizzati entrambi i dispositivi, senza account.",
    nl: "Het lijkt erop dat je Lexis al op deze telefoon gebruikt. Deze desktop is leeg: stuur je werkruimte hiernaartoe zodat beide apparaten gesynchroniseerd blijven, zonder account.",
    tr: "Görünüşe göre Lexis'i zaten bu telefonda kullanıyorsun. Bu masaüstü boş: iki cihaz da senkronize kalsın diye çalışma alanını buraya gönder, hesap gerekmez.",
    ja: "このスマホで Lexis をすでに使っているようです。このデスクトップは空です。アカウント不要で両デバイスを同期するため、ワークスペースをここに送信してください。",
    zh: "看起来你已在这部手机上使用 Lexis。此桌面是空的——把你的工作区发送到这里，让两台设备保持同步，无需账户。",
  },
  "pair.directionSend": {
    en: "Send my data to this desktop",
    es: "Enviar mis datos a este escritorio",
    fr: "Envoyer mes données à cet ordinateur",
    de: "Meine Daten an diesen Desktop senden",
    pt: "Enviar meus dados para este desktop",
    ar: "إرسال بياناتي إلى هذا الجهاز",
    pl: "Wyślij moje dane na ten komputer",
    it: "Invia i miei dati a questo desktop",
    nl: "Mijn gegevens naar deze desktop sturen",
    tr: "Verilerimi bu masaüstüne gönder",
    ja: "このデスクトップにデータを送信",
    zh: "把我的数据发送到此桌面",
  },
  "pair.directionKeep": {
    en: "Use this desktop's empty workspace",
    es: "Usar el espacio de trabajo vacío de este escritorio",
    fr: "Utiliser l'espace de travail vide de cet ordinateur",
    de: "Leeren Arbeitsbereich dieses Desktops verwenden",
    pt: "Usar o espaço de trabalho vazio deste desktop",
    ar: "استخدام مساحة عمل هذا الجهاز الفارغة",
    pl: "Użyj pustego obszaru roboczego tego komputera",
    it: "Usa lo spazio di lavoro vuoto di questo desktop",
    nl: "Lege werkruimte van deze desktop gebruiken",
    tr: "Bu masaüstünün boş çalışma alanını kullan",
    ja: "このデスクトップの空のワークスペースを使う",
    zh: "使用此桌面的空白工作区",
  },
};

let missing = 0;
for (const [key, byLang] of Object.entries(keys)) {
  for (const [lang, val] of Object.entries(byLang)) {
    // Insert after the "pair.skip" line of that language block.
    // Find the language block by its unique "pair.skip" line, then insert
    // after the *next* closing of that block is not needed: we insert right
    // after the pair.skip line itself (same block).
    const skipPattern = new RegExp(
      `(    "${lang === "en" ? "en" : ""}".*"pair\\.skip": "[^"]*",)`
    );
    // Simpler: find the exact "pair.skip": "..." line for this lang by
    // locating the language key first.
    const langRe = new RegExp(`  ${lang}: \\{`);
    const m = langRe.exec(s);
    if (!m) {
      console.error("no block for", lang);
      missing++;
      continue;
    }
    const blockStart = m.index;
    const skipIdx = s.indexOf('"pair.skip"', blockStart);
    if (skipIdx === -1) {
      console.error("no pair.skip in", lang);
      missing++;
      continue;
    }
    const lineEnd = s.indexOf("\n", skipIdx);
    // Scoped to THIS language block: only treat as present if the key exists
    // after this block's start and before the next language block.
    const nextBlock = /\n  \w+: \{/.exec(s.slice(blockStart + 2));
    const blockEnd = nextBlock ? blockStart + 2 + nextBlock.index : s.length;
    const block = s.slice(blockStart, blockEnd);
    if (block.includes(`    "${key}": `)) {
      // key already present for this lang - skip
      continue;
    }
    const insertAt = lineEnd + 1;
    s = s.slice(0, insertAt) + `    "${key}": ${JSON.stringify(val)},\n` + s.slice(insertAt);
  }
}

fs.writeFileSync(f, s);
console.log("added keys; missing blocks:", missing);
// count per key
for (const key of Object.keys(keys)) {
  const count = (s.match(new RegExp('"' + key + '":', "g")) || []).length;
  console.log(key, count + "/12");
}
