// Inserts pair.errorTitle + pair.errorDesc right after each pair.active line.
const fs = require("fs");
const f = "src/lib/i18n.ts";
let s = fs.readFileSync(f, "utf8");

const inserts = [
  ['"pair.active": "Active for 24 hours",',
   '"pair.errorTitle": "Can\'t reach your desktop",',
   '"pair.errorDesc": "Make sure Lexis Desktop is open and this phone is on the same Wi-Fi (or your phone\'s hotspot), then try again.",'],
  ['"pair.active": "Activo durante 24 horas",',
   '"pair.errorTitle": "No se puede conectar con tu escritorio",',
   '"pair.errorDesc": "Asegúrate de que Lexis Desktop esté abierto y de que este teléfono esté en la misma Wi-Fi (o en el punto de acceso del teléfono) e inténtalo de nuevo.",'],
  ['"pair.active": "Actif pendant 24 heures",',
   '"pair.errorTitle": "Impossible de joindre votre bureau",',
   '"pair.errorDesc": "Vérifiez que Lexis Desktop est ouvert et que ce téléphone est sur le même Wi-Fi (ou le partage de connexion), puis réessayez.",'],
  ['"pair.active": "24 Stunden aktiv",',
   '"pair.errorTitle": "Desktop nicht erreichbar",',
   '"pair.errorDesc": "Stelle sicher, dass Lexis Desktop geöffnet ist und dieses Telefon im selben Wi-Fi (oder Hotspot) ist, und versuche es erneut.",'],
  ['"pair.active": "Ativo por 24 horas",',
   '"pair.errorTitle": "Não foi possível acessar seu desktop",',
   '"pair.errorDesc": "Verifique se o Lexis Desktop está aberto e se este telefone está no mesmo Wi-Fi (ou no roteador do telefone) e tente novamente.",'],
  ['"pair.active": "نشط لمدة 24 ساعة",',
   '"pair.errorTitle": "تعذّر الوصول إلى سطح المكتب",',
   '"pair.errorDesc": "تأكد من أن Lexis Desktop مفتوح وأن هذا الهاتف على نفس شبكة Wi-Fi (أو نقطة اتصال الهاتف)، ثم حاول مرة أخرى.",'],
  ['"pair.active": "Aktywne przez 24 godziny",',
   '"pair.errorTitle": "Nie można połączyć się z desktopem",',
   '"pair.errorDesc": "Upewnij się, że Lexis Desktop jest otwarty i że telefon jest w tej samej sieci Wi-Fi (lub hotspotcie), a następnie spróbuj ponownie.",'],
  ['"pair.active": "Attivo per 24 ore",',
   '"pair.errorTitle": "Impossibile raggiungere il desktop",',
   '"pair.errorDesc": "Assicurati che Lexis Desktop sia aperto e che questo telefono sia sulla stessa rete Wi-Fi (o hotspot), poi riprova.",'],
  ['"pair.active": "24 uur actief",',
   '"pair.errorTitle": "Kan je desktop niet bereiken",',
   '"pair.errorDesc": "Zorg dat Lexis Desktop open is en deze telefoon op hetzelfde wifi (of de hotspot) zit, en probeer het opnieuw.",'],
  ['"pair.active": "24 saat aktif",',
   '"pair.errorTitle": "Masaüstüne ulaşılamıyor",',
   '"pair.errorDesc": "Lexis Desktop\'ın açık olduğundan ve bu telefonun aynı Wi-Fi\'de (veya hotspot\'ta) olduğundan emin ol, sonra tekrar dene.",'],
  ['"pair.active": "24時間アクティブ",',
   '"pair.errorTitle": "デスクトップに接続できません",',
   '"pair.errorDesc": "Lexisデスクトップが開いていることと、この電話が同じWi-Fi（またはホットスポット）にいることを確認して、もう一度お試しください。",'],
  ['"pair.active": "24小时有效",',
   '"pair.errorTitle": "无法连接桌面端",',
   '"pair.errorDesc": "请确保 Lexis 桌面端已打开，且此手机在同一 Wi-Fi（或热点）下，然后重试。",'],
];

let count = 0;
for (const [anchor, t1, t2] of inserts) {
  if (s.includes(anchor)) {
    s = s.split(anchor).join(anchor + "\n    " + t1 + "\n    " + t2);
    count++;
  } else {
    console.log("MISS:", anchor.slice(0, 40));
  }
}
fs.writeFileSync(f, s);
console.log("inserted:", count);
