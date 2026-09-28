// Updates the pairing i18n strings: clearer desktopOnly message (mentions the
// 1.15.0+ requirement + update path) and a new getDesktop button label.
// The language dicts appear in src/lib/i18n.ts in a fixed order (en, es, fr,
// de, pt, ar, pl, it, nl, tr, ja, zh) - the global replace consumes them in
// that order.
const fs = require("fs");

const file = "src/lib/i18n.ts";
let src = fs.readFileSync(file, "utf8");

const strings = [
  ["en", "Pairing needs Orleia Desktop 1.15.0+. If you're in a browser, open the Orleia Desktop app. Already in the app? Update it from lexisapp.xyz and try again.", "Get Orleia Desktop"],
  ["es", "El emparejamiento requiere Orleia Desktop 1.15.0+. Si estás en un navegador, abre la app Orleia Desktop. ¿Ya estás en la app? Actualízala desde lexisapp.xyz e inténtalo de nuevo.", "Obtener Orleia Desktop"],
  ["fr", "Le jumelage nécessite Orleia Desktop 1.15.0+. Si vous êtes dans un navigateur, ouvrez l'application Orleia Desktop. Déjà dans l'application ? Mettez-la à jour depuis lexisapp.xyz et réessayez.", "Obtenir Orleia Desktop"],
  ["de", "Für die Kopplung ist Orleia Desktop 1.15.0+ erforderlich. Wenn du im Browser bist, öffne die Orleia-Desktop-App. Schon in der App? Aktualisiere sie über lexisapp.xyz und versuche es erneut.", "Orleia Desktop holen"],
  ["pt", "O pareamento requer o Orleia Desktop 1.15.0+. Se você estiver no navegador, abra o aplicativo Orleia Desktop. Já está no app? Atualize-o pelo lexisapp.xyz e tente novamente.", "Obter Orleia Desktop"],
  ["ar", "يتطلب الاقتران Orleia Desktop 1.15.0+. إذا كنت في المتصفح، افتح تطبيق Orleia Desktop. هل أنت بالفعل في التطبيق؟ حدّثه من lexisapp.xyz وحاول مرة أخرى.", "احصل على Orleia Desktop"],
  ["pl", "Parowanie wymaga Orleia Desktop 1.15.0+. Jeśli jesteś w przeglądarce, otwórz aplikację Orleia Desktop. Już jesteś w aplikacji? Zaktualizuj ją z lexisapp.xyz i spróbuj ponownie.", "Pobierz Orleia Desktop"],
  ["it", "L'associazione richiede Orleia Desktop 1.15.0+. Se sei nel browser, apri l'app Orleia Desktop. Già nell'app? Aggiornala da lexisapp.xyz e riprova.", "Scarica Orleia Desktop"],
  ["nl", "Koppelen vereist Orleia Desktop 1.15.0+. Als je in een browser zit, open dan de Orleia Desktop-app. Al in de app? Werk deze bij via lexisapp.xyz en probeer het opnieuw.", "Orleia Desktop downloaden"],
  ["tr", "Eşleştirme Orleia Desktop 1.15.0+ gerektirir. Tarayıcıdaysan Orleia Desktop uygulamasını aç. Zaten uygulamada mısın? lexisapp.xyz'den güncelle ve tekrar dene.", "Orleia Desktop'ı Al"],
  ["ja", "ペアリングにはOrleiaデスクトップ1.15.0+が必要です。ブラウザで開いている場合はOrleiaデスクトップアプリを開いてください。すでにアプリ内の場合は、lexisapp.xyzから更新して再度お試しください。", "Orleiaデスクトップを入手"],
  ["zh", "配对需要 Orleia Desktop 1.15.0+。如果你在浏览器中，请打开 Orleia 桌面应用。如果你已经在应用中，请从 lexisapp.xyz 更新后再试。", "获取 Orleia Desktop"],
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
