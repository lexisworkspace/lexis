// Updates the pairing i18n strings: clearer desktopOnly message (mentions the
// 1.15.0+ requirement + update path) and a new getDesktop button label.
// The language dicts appear in src/lib/i18n.ts in a fixed order (en, es, fr,
// de, pt, ar, pl, it, nl, tr, ja, zh) - the global replace consumes them in
// that order.
const fs = require("fs");

const file = "src/lib/i18n.ts";
let src = fs.readFileSync(file, "utf8");

const strings = [
  ["en", "Pairing needs Lexis Desktop 1.15.0+. If you're in a browser, open the Lexis Desktop app. Already in the app? Update it from lexisapp.xyz and try again.", "Get Lexis Desktop"],
  ["es", "El emparejamiento requiere Lexis Desktop 1.15.0+. Si estás en un navegador, abre la app Lexis Desktop. ¿Ya estás en la app? Actualízala desde lexisapp.xyz e inténtalo de nuevo.", "Obtener Lexis Desktop"],
  ["fr", "Le jumelage nécessite Lexis Desktop 1.15.0+. Si vous êtes dans un navigateur, ouvrez l'application Lexis Desktop. Déjà dans l'application ? Mettez-la à jour depuis lexisapp.xyz et réessayez.", "Obtenir Lexis Desktop"],
  ["de", "Für die Kopplung ist Lexis Desktop 1.15.0+ erforderlich. Wenn du im Browser bist, öffne die Lexis-Desktop-App. Schon in der App? Aktualisiere sie über lexisapp.xyz und versuche es erneut.", "Lexis Desktop holen"],
  ["pt", "O pareamento requer o Lexis Desktop 1.15.0+. Se você estiver no navegador, abra o aplicativo Lexis Desktop. Já está no app? Atualize-o pelo lexisapp.xyz e tente novamente.", "Obter Lexis Desktop"],
  ["ar", "يتطلب الاقتران Lexis Desktop 1.15.0+. إذا كنت في المتصفح، افتح تطبيق Lexis Desktop. هل أنت بالفعل في التطبيق؟ حدّثه من lexisapp.xyz وحاول مرة أخرى.", "احصل على Lexis Desktop"],
  ["pl", "Parowanie wymaga Lexis Desktop 1.15.0+. Jeśli jesteś w przeglądarce, otwórz aplikację Lexis Desktop. Już jesteś w aplikacji? Zaktualizuj ją z lexisapp.xyz i spróbuj ponownie.", "Pobierz Lexis Desktop"],
  ["it", "L'associazione richiede Lexis Desktop 1.15.0+. Se sei nel browser, apri l'app Lexis Desktop. Già nell'app? Aggiornala da lexisapp.xyz e riprova.", "Scarica Lexis Desktop"],
  ["nl", "Koppelen vereist Lexis Desktop 1.15.0+. Als je in een browser zit, open dan de Lexis Desktop-app. Al in de app? Werk deze bij via lexisapp.xyz en probeer het opnieuw.", "Lexis Desktop downloaden"],
  ["tr", "Eşleştirme Lexis Desktop 1.15.0+ gerektirir. Tarayıcıdaysan Lexis Desktop uygulamasını aç. Zaten uygulamada mısın? lexisapp.xyz'den güncelle ve tekrar dene.", "Lexis Desktop'ı Al"],
  ["ja", "ペアリングにはLexisデスクトップ1.15.0+が必要です。ブラウザで開いている場合はLexisデスクトップアプリを開いてください。すでにアプリ内の場合は、lexisapp.xyzから更新して再度お試しください。", "Lexisデスクトップを入手"],
  ["zh", "配对需要 Lexis Desktop 1.15.0+。如果你在浏览器中，请打开 Lexis 桌面应用。如果你已经在应用中，请从 lexisapp.xyz 更新后再试。", "获取 Lexis Desktop"],
];

// 1. Replace all desktopOnly values, consuming entries in file order.
let i = 0;
src = src.replace(/"pair\.desktopOnly": "[^"]*"/g, () => {
  const [, desktopOnly] = strings[i++];
  return `"pair.desktopOnly": "${desktopOnly.replace(/"/g, '\\"')}"`;
});
if (i !== strings.length) {
  console.error(`FAIL: expected ${strings.length} desktopOnly entries, replaced ${i}`);
  process.exit(1);
}

// 2. Insert getDesktop right after each desktopOnly line (values are unique).
for (const [, desktopOnly, getDesktop] of strings) {
  const marker = `"pair.desktopOnly": "${desktopOnly.replace(/"/g, '\\"')}"`;
  const idx = src.indexOf(marker);
  if (idx < 0) {
    console.error(`FAIL: marker not found for a language`);
    process.exit(1);
  }
  const lineEnd = src.indexOf("\n", idx);
  src =
    src.slice(0, lineEnd) +
    `,\n    "pair.getDesktop": "${getDesktop.replace(/"/g, '\\"')}"` +
    src.slice(lineEnd);
}

fs.writeFileSync(file, src);
console.log("Updated desktopOnly + added getDesktop for all 12 languages.");
