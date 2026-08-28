#!/usr/bin/env python
"""Add code-based sync i18n keys to all 19 languages."""
import re

KEYS = {
    "en": {
        "settings.syncConnected": "Synced",
        "settings.syncCode": "Sync code",
        "settings.syncDisconnect": "Stop syncing",
        "settings.syncHowItWorks": "Enter the same 6-digit code on both devices to sync them over the internet. Your data is encrypted — only your devices can read it.",
        "settings.syncNewCode": "Create a new sync code",
        "settings.syncGenerateCode": "Generate Code",
        "settings.syncEnterCode": "Enter a code from another device",
        "settings.syncJoin": "Join",
        "settings.syncCodeError": "Could not connect. Check the code and try again.",
        "common.or": "or",
    },
    "es": {
        "settings.syncConnected": "Sincronizado",
        "settings.syncCode": "Código de sincronización",
        "settings.syncDisconnect": "Detener sincronización",
        "settings.syncHowItWorks": "Ingresa el mismo código de 6 dígitos en ambos dispositivos para sincronizarlos por internet. Tus datos están encriptados — solo tus dispositivos pueden leerlos.",
        "settings.syncNewCode": "Crear un nuevo código",
        "settings.syncGenerateCode": "Generar Código",
        "settings.syncEnterCode": "Ingresa un código de otro dispositivo",
        "settings.syncJoin": "Unirse",
        "settings.syncCodeError": "No se pudo conectar. Verifica el código e intenta de nuevo.",
        "common.or": "o",
    },
    "fr": {
        "settings.syncConnected": "Synchronisé",
        "settings.syncCode": "Code de synchronisation",
        "settings.syncDisconnect": "Arrêter la synchronisation",
        "settings.syncHowItWorks": "Saisissez le même code à 6 chiffres sur les deux appareils pour les synchroniser via Internet. Vos données sont chiffrées — seuls vos appareils peuvent les lire.",
        "settings.syncNewCode": "Créer un nouveau code",
        "settings.syncGenerateCode": "Générer le code",
        "settings.syncEnterCode": "Saisir un code d'un autre appareil",
        "settings.syncJoin": "Rejoindre",
        "settings.syncCodeError": "Impossible de se connecter. Vérifiez le code et réessayez.",
        "common.or": "ou",
    },
    "de": {
        "settings.syncConnected": "Synchronisiert",
        "settings.syncCode": "Synchronisationscode",
        "settings.syncDisconnect": "Synchronisation stoppen",
        "settings.syncHowItWorks": "Gib denselben 6-stelligen Code auf beiden Geräten ein, um sie über das Internet zu synchronisieren. Deine Daten sind verschlüsselt — nur deine Geräte können sie lesen.",
        "settings.syncNewCode": "Neuen Code erstellen",
        "settings.syncGenerateCode": "Code generieren",
        "settings.syncEnterCode": "Code von einem anderen Gerät eingeben",
        "settings.syncJoin": "Beitreten",
        "settings.syncCodeError": "Verbindung fehlgeschlagen. Überprüfe den Code und versuche es erneut.",
        "common.or": "oder",
    },
    "pt": {
        "settings.syncConnected": "Sincronizado",
        "settings.syncCode": "Código de sincronização",
        "settings.syncDisconnect": "Parar sincronização",
        "settings.syncHowItWorks": "Digite o mesmo código de 6 dígitos em ambos os dispositivos para sincronizá-los pela internet. Seus dados são criptografados — apenas seus dispositivos podem lê-los.",
        "settings.syncNewCode": "Criar novo código",
        "settings.syncGenerateCode": "Gerar Código",
        "settings.syncEnterCode": "Digite um código de outro dispositivo",
        "settings.syncJoin": "Entrar",
        "settings.syncCodeError": "Não foi possível conectar. Verifique o código e tente novamente.",
        "common.or": "ou",
    },
    "it": {
        "settings.syncConnected": "Sincronizzato",
        "settings.syncCode": "Codice di sincronizzazione",
        "settings.syncDisconnect": "Interrompi sincronizzazione",
        "settings.syncHowItWorks": "Inserisci lo stesso codice a 6 cifre su entrambi i dispositivi per sincronizzarli via Internet. I tuoi dati sono crittografati — solo i tuoi dispositivi possono leggerli.",
        "settings.syncNewCode": "Crea un nuovo codice",
        "settings.syncGenerateCode": "Genera Codice",
        "settings.syncEnterCode": "Inserisci il codice di un altro dispositivo",
        "settings.syncJoin": "Unisciti",
        "settings.syncCodeError": "Impossibile connettersi. Controlla il codice e riprova.",
        "common.or": "oppure",
    },
    "nl": {
        "settings.syncConnected": "Gesynchroniseerd",
        "settings.syncCode": "Synchronisatiecode",
        "settings.syncDisconnect": "Synchronisatie stoppen",
        "settings.syncHowItWorks": "Voer dezelfde 6-cijferige code in op beide apparaten om ze via het internet te synchroniseren. Je gegevens zijn versleuteld — alleen je apparaten kunnen ze lezen.",
        "settings.syncNewCode": "Nieuwe code aanmaken",
        "settings.syncGenerateCode": "Code genereren",
        "settings.syncEnterCode": "Code van een ander apparaat invoeren",
        "settings.syncJoin": "Deelnemen",
        "settings.syncCodeError": "Kan geen verbinding maken. Controleer de code en probeer het opnieuw.",
        "common.or": "of",
    },
    "pl": {
        "settings.syncConnected": "Zsynchronizowano",
        "settings.syncCode": "Kod synchronizacji",
        "settings.syncDisconnect": "Zatrzymaj synchronizację",
        "settings.syncHowItWorks": "Wprowadź ten sam 6-cyfrowy kod na obu urządzeniach, aby je zsynchronizować przez internet. Twoje dane są szyfrowane — tylko Twoje urządzenia mogą je odczytać.",
        "settings.syncNewCode": "Utwórz nowy kod",
        "settings.syncGenerateCode": "Wygeneruj kod",
        "settings.syncEnterCode": "Wprowadź kod z innego urządzenia",
        "settings.syncJoin": "Dołącz",
        "settings.syncCodeError": "Nie udało się połączyć. Sprawdź kod i spróbuj ponownie.",
        "common.or": "lub",
    },
    "tr": {
        "settings.syncConnected": "Senkronize edildi",
        "settings.syncCode": "Senkronizasyon kodu",
        "settings.syncDisconnect": "Senkronizasyonu durdur",
        "settings.syncHowItWorks": "Cihazları internet üzerinden senkronize etmek için her iki cihaza da aynı 6 haneli kodu girin. Verileriniz şifrelenir — yalnızca cihazlarınız okuyabilir.",
        "settings.syncNewCode": "Yeni kod oluştur",
        "settings.syncGenerateCode": "Kod Oluştur",
        "settings.syncEnterCode": "Başka bir cihazdan kod girin",
        "settings.syncJoin": "Katıl",
        "settings.syncCodeError": "Bağlantı kurulamadı. Kodu kontrol edin ve tekrar deneyin.",
        "common.or": "veya",
    },
    "ja": {
        "settings.syncConnected": "同期済み",
        "settings.syncCode": "同期コード",
        "settings.syncDisconnect": "同期を停止",
        "settings.syncHowItWorks": "両方のデバイスで同じ6桁のコードを入力すると、インターネット経由で同期されます。データは暗号化されています — あなたのデバイスだけが読み取れます。",
        "settings.syncNewCode": "新しいコードを作成",
        "settings.syncGenerateCode": "コードを生成",
        "settings.syncEnterCode": "別のデバイスのコードを入力",
        "settings.syncJoin": "参加",
        "settings.syncCodeError": "接続できませんでした。コードを確認してやり直してください。",
        "common.or": "または",
    },
    "ko": {
        "settings.syncConnected": "동기화됨",
        "settings.syncCode": "동기화 코드",
        "settings.syncDisconnect": "동기화 중지",
        "settings.syncHowItWorks": "두 디바이스에서 같은 6자리 코드를 입력하면 인터넷을 통해 동기화됩니다. 데이터는 암호화됩니다 — 귀하의 디바이스만 읽을 수 있습니다.",
        "settings.syncNewCode": "새 코드 만들기",
        "settings.syncGenerateCode": "코드 생성",
        "settings.syncEnterCode": "다른 디바이스의 코드 입력",
        "settings.syncJoin": "참여",
        "settings.syncCodeError": "연결할 수 없습니다. 코드를 확인하고 다시 시도하세요.",
        "common.or": "또는",
    },
    "ru": {
        "settings.syncConnected": "Синхронизировано",
        "settings.syncCode": "Код синхронизации",
        "settings.syncDisconnect": "Остановить синхронизацию",
        "settings.syncHowItWorks": "Введите один и тот же 6-значный код на обоих устройствах для синхронизации через интернет. Ваши данные зашифрованы — только ваши устройства могут их прочитать.",
        "settings.syncNewCode": "Создать новый код",
        "settings.syncGenerateCode": "Сгенерировать код",
        "settings.syncEnterCode": "Введите код с другого устройства",
        "settings.syncJoin": "Присоединиться",
        "settings.syncCodeError": "Не удалось подключиться. Проверьте код и попробуйте снова.",
        "common.or": "или",
    },
    "hi": {
        "settings.syncConnected": "सिंक हो गया",
        "settings.syncCode": "सिंक कोड",
        "settings.syncDisconnect": "सिंक बंद करें",
        "settings.syncHowItWorks": "दोनों डिवाइस पर वही 6 अंकों का कोड दर्ज करें ताकि वे इंटरनेट के माध्यम से सिंक हो जाएं। आपका डेटा एन्क्रिप्ट किया गया है — केवल आपके डिवाइस ही इसे पढ़ सकते हैं।",
        "settings.syncNewCode": "नया कोड बनाएं",
        "settings.syncGenerateCode": "कोड जनरेट करें",
        "settings.syncEnterCode": "दूसरे डिवाइस का कोड दर्ज करें",
        "settings.syncJoin": "शामिल हों",
        "settings.syncCodeError": "कनेक्ट नहीं हो सका। कोड जांचें और फिर से प्रयास करें।",
        "common.or": "या",
    },
    "vi": {
        "settings.syncConnected": "Đã đồng bộ",
        "settings.syncCode": "Mã đồng bộ",
        "settings.syncDisconnect": "Ngừng đồng bộ",
        "settings.syncHowItWorks": "Nhập cùng mã 6 chữ số trên cả hai thiết bị để đồng bộ qua internet. Dữ liệu được mã hóa — chỉ thiết bị của bạn mới đọc được.",
        "settings.syncNewCode": "Tạo mã mới",
        "settings.syncGenerateCode": "Tạo mã",
        "settings.syncEnterCode": "Nhập mã từ thiết bị khác",
        "settings.syncJoin": "Tham gia",
        "settings.syncCodeError": "Không thể kết nối. Kiểm tra mã và thử lại.",
        "common.or": "hoặc",
    },
    "id": {
        "settings.syncConnected": "Tersinkronisasi",
        "settings.syncCode": "Kode sinkronisasi",
        "settings.syncDisconnect": "Hentikan sinkronisasi",
        "settings.syncHowItWorks": "Masukkan kode 6 digit yang sama di kedua perangkat untuk menyinkronkannya melalui internet. Data Anda dienkripsi — hanya perangkat Anda yang bisa membacanya.",
        "settings.syncNewCode": "Buat kode baru",
        "settings.syncGenerateCode": "Buat Kode",
        "settings.syncEnterCode": "Masukkan kode dari perangkat lain",
        "settings.syncJoin": "Gabung",
        "settings.syncCodeError": "Tidak dapat terhubung. Periksa kode dan coba lagi.",
        "common.or": "atau",
    },
    "th": {
        "settings.syncConnected": "ซิงค์แล้ว",
        "settings.syncCode": "รหัสซิงค์",
        "settings.syncDisconnect": "หยุดการซิงค์",
        "settings.syncHowItWorks": "ป้อนรหัส 6 หลักเดียวกันบนทั้งสองอุปกรณ์เพื่อซิงค์ผ่านอินเทอร์เน็ต ข้อมูลถูกเข้ารหัส — มีเพียงอุปกรณ์ของคุณเท่านั้นที่อ่านได้",
        "settings.syncNewCode": "สร้างรหัสใหม่",
        "settings.syncGenerateCode": "สร้างรหัส",
        "settings.syncEnterCode": "ป้อนรหัสจากอุปกรณ์อื่น",
        "settings.syncJoin": "เข้าร่วม",
        "settings.syncCodeError": "ไม่สามารถเชื่อมต่อได้ ตรวจสอบรหัสแล้วลองอีกครั้ง",
        "common.or": "หรือ",
    },
    "sv": {
        "settings.syncConnected": "Synkroniserat",
        "settings.syncCode": "Synkroniseringskod",
        "settings.syncDisconnect": "Stoppa synkronisering",
        "settings.syncHowItWorks": "Ange samma 6-siffriga kod på båda enheterna för att synkronisera dem via internet. Dina data är krypterade — bara dina enheter kan läsa dem.",
        "settings.syncNewCode": "Skapa ny kod",
        "settings.syncGenerateCode": "Generera kod",
        "settings.syncEnterCode": "Ange kod från en annan enhet",
        "settings.syncJoin": "Gå med",
        "settings.syncCodeError": "Kunde inte ansluta. Kontrollera koden och försök igen.",
        "common.or": "eller",
    },
    "ar": {
        "settings.syncConnected": "تمت المزامنة",
        "settings.syncCode": "رمز المزامنة",
        "settings.syncDisconnect": "إيقاف المزامنة",
        "settings.syncHowItWorks": "أدخل نفس الرمز المكون من 6 أرقام على الجهازين لمزامنتهما عبر الإنترنت. بياناتك مشفرة — فقط أجهزتك يمكنها قراءتها.",
        "settings.syncNewCode": "إنشاء رمز جديد",
        "settings.syncGenerateCode": "إنشاء رمز",
        "settings.syncEnterCode": "أدخل رمزاً من جهاز آخر",
        "settings.syncJoin": "انضم",
        "settings.syncCodeError": "تعذر الاتصال. تحقق من الرمز وحاول مرة أخرى.",
        "common.or": "أو",
    },
    "zh": {
        "settings.syncConnected": "已同步",
        "settings.syncCode": "同步码",
        "settings.syncDisconnect": "停止同步",
        "settings.syncHowItWorks": "在两台设备上输入相同的6位数字代码，即可通过互联网同步。你的数据已加密 — 只有你的设备可以读取。",
        "settings.syncNewCode": "创建新代码",
        "settings.syncGenerateCode": "生成代码",
        "settings.syncEnterCode": "输入其他设备的代码",
        "settings.syncJoin": "加入",
        "settings.syncCodeError": "无法连接。请检查代码后重试。",
        "common.or": "或",
    },
}

with open("src/lib/i18n.ts", "r", encoding="utf-8") as f:
    content = f.read()

lang_order = ["en","es","fr","de","pt","it","nl","pl","tr","ja","ko","ru","hi","vi","id","th","sv","ar","zh"]

for lang in lang_order:
    if lang not in KEYS:
        continue
    
    m = re.search(rf'^  {lang}: \{{', content, re.MULTILINE)
    if not m:
        print(f"{lang}: BLOCK NOT FOUND")
        continue
    
    block_start = m.start()
    next_block = len(content)
    for other in lang_order:
        if other == lang:
            continue
        nm = re.search(rf'^  {other}: \{{', content[m.end():], re.MULTILINE)
        if nm:
            candidate = nm.start() + m.end()
            if candidate < next_block:
                next_block = candidate
    
    block = content[block_start:next_block]
    if "settings.syncConnected" in block:
        print(f"{lang}: already has v2 sync keys, skipping")
        continue
    
    # Find the last }, before the next block
    last_brace = content.rfind("},", block_start, next_block)
    if last_brace == -1:
        print(f"{lang}: no closing brace found")
        continue
    
    key_lines = []
    for key, value in KEYS[lang].items():
        key_lines.append(f'    "{key}": "{value}",')
    
    insert_text = "\n" + "\n".join(key_lines) + "\n"
    content = content[:last_brace] + insert_text + "  " + content[last_brace:]
    
    print(f"{lang}: added {len(KEYS[lang])} keys")

with open("src/lib/i18n.ts", "w", encoding="utf-8") as f:
    f.write(content)

print("Done!")
