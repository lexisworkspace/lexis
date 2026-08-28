#!/usr/bin/env python3
"""Add sync relay i18n keys to all 19 languages in i18n.ts."""
import re

SYNC_KEYS = {
    "en": {
        "settings.sync": "Cross-Device Sync",
        "settings.syncDesc": "Sync your workspace across devices over the internet. Works anywhere — no WiFi required.",
        "settings.syncRelay": "Cloud Relay",
        "settings.syncRelayDesc": "Encrypt and sync your data through a relay server. Only your devices can read it.",
        "settings.syncRelayUrl": "Relay Server URL",
        "settings.syncInfo": "Your data is encrypted with AES-256 before leaving your device. The relay server never sees your data in plain text. Deploy your own relay for free with Cloudflare Workers.",
    },
    "es": {
        "settings.sync": "Sincronización entre dispositivos",
        "settings.syncDesc": "Sincroniza tu espacio de trabajo entre dispositivos por internet. Funciona en cualquier lugar — no necesitas WiFi.",
        "settings.syncRelay": "Relé en la nube",
        "settings.syncRelayDesc": "Encripta y sincroniza tus datos a través de un servidor relé. Solo tus dispositivos pueden leerlos.",
        "settings.syncRelayUrl": "URL del servidor relé",
        "settings.syncInfo": "Tus datos se encriptan con AES-256 antes de salir de tu dispositivo. El servidor relé nunca ve tus datos en texto plano. Implementa tu propio relé gratis con Cloudflare Workers.",
    },
    "fr": {
        "settings.sync": "Synchronisation multi-appareils",
        "settings.syncDesc": "Synchronisez votre espace de travail entre appareils via Internet. Fonctionne partout — pas besoin de WiFi.",
        "settings.syncRelay": "Relais cloud",
        "settings.syncRelayDesc": "Chiffrez et synchronisez vos données via un serveur relais. Seuls vos appareils peuvent les lire.",
        "settings.syncRelayUrl": "URL du serveur relais",
        "settings.syncInfo": "Vos données sont chiffrées avec AES-256 avant de quitter votre appareil. Le serveur relais ne voit jamais vos données en clair. Déployez votre propre relais gratuitement avec Cloudflare Workers.",
    },
    "de": {
        "settings.sync": "Geräteübergreifende Synchronisation",
        "settings.syncDesc": "Synchronisiere deinen Arbeitsbereich über das Internet zwischen Geräten. Funktioniert überall — kein WiFi nötig.",
        "settings.syncRelay": "Cloud-Relay",
        "settings.syncRelayDesc": "Verschlüsse und synchronisiere deine Daten über einen Relay-Server. Nur deine Geräte können sie lesen.",
        "settings.syncRelayUrl": "Relay-Server-URL",
        "settings.syncInfo": "Deine Daten werden mit AES-256 verschlüsselt, bevor sie dein Gerät verlassen. Der Relay-Server sieht deine Daten nie im Klartext. Deploye deinen eigenen Relay kostenlos mit Cloudflare Workers.",
    },
    "pt": {
        "settings.sync": "Sincronização entre dispositivos",
        "settings.syncDesc": "Sincronize seu espaço de trabalho entre dispositivos pela internet. Funciona em qualquer lugar — não precisa de WiFi.",
        "settings.syncRelay": "Relé na nuvem",
        "settings.syncRelayDesc": "Criptografe e sincronize seus dados através de um servidor relé. Apenas seus dispositivos podem ler.",
        "settings.syncRelayUrl": "URL do servidor relé",
        "settings.syncInfo": "Seus dados são criptografados com AES-256 antes de sair do seu dispositivo. O servidor relé nunca vê seus dados em texto plano. Implemente seu próprio relé gratuitamente com Cloudflare Workers.",
    },
    "it": {
        "settings.sync": "Sincronizzazione multi-dispositivo",
        "settings.syncDesc": "Sincronizza il tuo spazio di lavoro tra dispositivi via Internet. Funziona ovunque — non serve il WiFi.",
        "settings.syncRelay": "Relay cloud",
        "settings.syncRelayDesc": "Crittografa e sincronizza i tuoi dati tramite un server relay. Solo i tuoi dispositivi possono leggerli.",
        "settings.syncRelayUrl": "URL del server relay",
        "settings.syncInfo": "I tuoi dati sono criptati con AES-256 prima di lasciare il tuo dispositivo. Il server relay non vede mai i tuoi dati in chiaro. Implementa il tuo relay gratis con Cloudflare Workers.",
    },
    "nl": {
        "settings.sync": "Synchronisatie tussen apparaten",
        "settings.syncDesc": "Synchroniseer je werkruimte tussen apparaten via het internet. Werkt overal — geen WiFi nodig.",
        "settings.syncRelay": "Cloud-relay",
        "settings.syncRelayDesc": "Versleutel en synchroniseer je gegevens via een relayserver. Alleen je apparaten kunnen ze lezen.",
        "settings.syncRelayUrl": "Relayserver-URL",
        "settings.syncInfo": "Je gegevens worden versleuteld met AES-256 voordat ze je apparaat verlaten. De relayserver ziet je gegevens nooit in platte tekst. Implementeer je eigen relay gratis met Cloudflare Workers.",
    },
    "pl": {
        "settings.sync": "Synchronizacja między urządzeniami",
        "settings.syncDesc": "Synchronizuj swój obszar roboczy między urządzeniami przez internet. Działa wszędzie — nie wymaga WiFi.",
        "settings.syncRelay": "Przekaźnik w chmurze",
        "settings.syncRelayDesc": "Szyfruj i synchronizuj dane przez serwer przekaźnikowy. Tylko Twoje urządzenia mogą je odczytać.",
        "settings.syncRelayUrl": "URL serwera przekaźnikowego",
        "settings.syncInfo": "Twoje dane są szyfrowane AES-256 przed opuszczeniem urządzenia. Serwer przekaźnikowy nigdy nie widzi Twoich danych w postaci tekstowej. Wdróż własny przekaźnik za darmo dzięki Cloudflare Workers.",
    },
    "tr": {
        "settings.sync": "Cihazlar Arası Senkronizasyon",
        "settings.syncDesc": "Çalışma alanını internet üzerinden cihazlar arasında senkronize et. Her yerde çalışır — WiFi gerekmez.",
        "settings.syncRelay": "Bulut Aktarıcı",
        "settings.syncRelayDesc": "Verilerini bir aktarıcı sunucusu üzerinden şifrele ve senkronize et. Yalnızca cihazların okuyabilir.",
        "settings.syncRelayUrl": "Aktarıcı Sunucu URL'si",
        "settings.syncInfo": "Verilerin cihazından ayrılmadan önce AES-256 ile şifrelenir. Aktarıcı sunucu verilerini asla düz metin olarak görmez. Cloudflare Workers ile kendi aktarıcını ücretsiz olarak dağıt.",
    },
    "it": {
        "settings.sync": "Sincronizzazione multi-dispositivo",
        "settings.syncDesc": "Sincronizza il tuo spazio di lavoro tra dispositivi via Internet. Funziona ovunque — non serve il WiFi.",
        "settings.syncRelay": "Relay cloud",
        "settings.syncRelayDesc": "Crittografa e sincronizza i tuoi dati tramite un server relay. Solo i tuoi dispositivi possono leggerli.",
        "settings.syncRelayUrl": "URL del server relay",
        "settings.syncInfo": "I tuoi dati sono criptati con AES-256 prima di lasciare il tuo dispositivo. Il server relay non vede mai i tuoi dati in chiaro. Implementa il tuo relay gratis con Cloudflare Workers.",
    },
    "ja": {
        "settings.sync": "デバイス間同期",
        "settings.syncDesc": "インターネット経由でデバイス間でワークスペースを同期します。どこでも動作します — WiFiは不要です。",
        "settings.syncRelay": "クラウドリレー",
        "settings.syncRelayDesc": "リレーサーバーを介してデータを暗号化し同期します。あなたのデバイスだけが読み取れます。",
        "settings.syncRelayUrl": "リレーサーバーURL",
        "settings.syncInfo": "データはデバイスを出る前にAES-256で暗号化されます。リレーサーバーがプレーンテキストでデータを見ることはありません。Cloudflare Workersで無料で独自のリレーをデプロイできます。",
    },
    "ko": {
        "settings.sync": "디바이스 간 동기화",
        "settings.syncDesc": "인터넷을 통해 디바이스 간에 작업 공간을 동기화합니다. 어디서든 작동합니다 — WiFi가 필요 없습니다.",
        "settings.syncRelay": "클라우드 릴레이",
        "settings.syncRelayDesc": "릴레이 서버를 통해 데이터를 암호화하고 동기화합니다. 귀하의 디바이스만 읽을 수 있습니다.",
        "settings.syncRelayUrl": "릴레이 서버 URL",
        "settings.syncInfo": "데이터는 디바이스를 떠나기 전에 AES-256로 암호화됩니다. 릴레이 서버가 평문 데이터를 보지 않습니다. Cloudflare Workers로 무료로 자체 릴레이를 배포하세요.",
    },
    "ru": {
        "settings.sync": "Синхронизация между устройствами",
        "settings.syncDesc": "Синхронизируйте рабочее пространство между устройствами через интернет. Работает везде — WiFi не нужен.",
        "settings.syncRelay": "Облачный ретранслятор",
        "settings.syncRelayDesc": "Шифруйте и синхронизируйте данные через сервер-ретранслятор. Только ваши устройства могут их прочитать.",
        "settings.syncRelayUrl": "URL сервера-ретранслятора",
        "settings.syncInfo": "Ваши данные шифруются AES-256 перед покиданием устройства. Сервер-ретранслятор никогда не видит ваши данные в открытом виде. Разверните собственный ретранслятор бесплатно с Cloudflare Workers.",
    },
    "hi": {
        "settings.sync": "डिवाइस के बीच सिंक",
        "settings.syncDesc": "इंटरनेट के माध्यम से अपने कार्यक्षेत्र को डिवाइस के बीच सिंक करें। कहीं भी काम करता है — WiFi की आवश्यकता नहीं है।",
        "settings.syncRelay": "क्लाउड रिले",
        "settings.syncRelayDesc": "रिले सर्वर के माध्यम से अपने डेटा को एन्क्रिप्ट और सिंक करें। केवल आपके डिवाइस ही इसे पढ़ सकते हैं।",
        "settings.syncRelayUrl": "रिले सर्वर URL",
        "settings.syncInfo": "आपका डेटा डिवाइस छोड़ने से पहले AES-256 से एन्क्रिप्ट किया जाता है। रिले सर्वर कभी भी प्लेन टेक्स्ट में आपका डेटा नहीं देखता। Cloudflare Workers के साथ मुफ्त में अपना रिले तैनात करें।",
    },
    "vi": {
        "settings.sync": "Đồng bộ đa thiết bị",
        "settings.syncDesc": "Đồng bộ không gian làm việc giữa các thiết bị qua internet. Hoạt động ở mọi nơi — không cần WiFi.",
        "settings.syncRelay": "Relay đám mây",
        "settings.syncRelayDesc": "Mã hóa và đồng bộ dữ liệu qua server relay. Chỉ thiết bị của bạn mới đọc được.",
        "settings.syncRelayUrl": "URL server relay",
        "settings.syncInfo": "Dữ liệu được mã hóa bằng AES-256 trước khi rời thiết bị. Server relay không bao giờ thấy dữ liệu dạng văn bản thuần. Triển khai relay miễn phí với Cloudflare Workers.",
    },
    "id": {
        "settings.sync": "Sinkronisasi Antarp Perangkat",
        "settings.syncDesc": "Sinkronkan ruang kerja Anda antar perangkat melalui internet. Bekerja di mana saja — tidak perlu WiFi.",
        "settings.syncRelay": "Relay Cloud",
        "settings.syncRelayDesc": "Enkripsi dan sinkronkan data Anda melalui server relay. Hanya perangkat Anda yang bisa membacanya.",
        "settings.syncRelayUrl": "URL Server Relay",
        "settings.syncInfo": "Data Anda dienkripsi dengan AES-256 sebelum meninggalkan perangkat. Server relay tidak pernah melihat data Anda dalam teks biasa. Deploy relay gratis dengan Cloudflare Workers.",
    },
    "th": {
        "settings.sync": "การซิงค์ระหว่างอุปกรณ์",
        "settings.syncDesc": "ซิงค์พื้นที่ทำงานของคุณระหว่างอุปกรณ์ผ่านอินเทอร์เน็ต ใช้งานได้ทุกที่ — ไม่ต้องใช้ WiFi",
        "settings.syncRelay": "คลาวด์รีเลย์",
        "settings.syncRelayDesc": "เข้ารหัสและซิงค์ข้อมูลของคุณผ่านเซิร์ฟเวอร์รีเลย์ มีเพียงอุปกรณ์ของคุณเท่านั้นที่อ่านได้",
        "settings.syncRelayUrl": "URL เซิร์ฟเวอร์รีเลย์",
        "settings.syncInfo": "ข้อมูลของคุณถูกเข้ารหัสด้วย AES-256 ก่อนออกจากอุปกรณ์ เซิร์ฟเวอร์รีเลย์ไม่เคยเห็นข้อมูลของคุณในรูปแบบข้อความ เริ่มต้นใช้งานรีเลย์ฟรีด้วย Cloudflare Workers",
    },
    "sv": {
        "settings.sync": "Synkronisering mellan enheter",
        "settings.syncDesc": "Synka din arbetsyta mellan enheter via internet. Fungerar överallt — ingen WiFi behövs.",
        "settings.syncRelay": "Moln-relä",
        "settings.syncRelayDesc": "Kryptera och synka dina data via en reläserver.bara dina enheter kan läsa dem.",
        "settings.syncRelayUrl": "Reläserver-URL",
        "settings.syncInfo": "Dina data krypteras med AES-256 innan de lämnar din enhet. Relärservern ser aldrig dina data i klartext. Implementera ditt eget relä gratis med Cloudflare Workers.",
    },
    "ar": {
        "settings.sync": "المزامنة بين الأجهزة",
        "settings.syncDesc": "مزامنة مساحة العمل الخاصة بك عبر الأجهزة عبر الإنترنت. تعمل في أي مكان — لا حاجة لـ WiFi.",
        "settings.syncRelay": "meyeceği سحابي",
        "settings.syncRelayDesc": "تشفير ومزامنة بياناتك عبر خادم الم reformed. فقط أجهزتك يمكنها قراءتها.",
        "settings.syncRelayUrl": "رابط خادم الم重新",
        "settings.syncInfo": "بياناتك مشفرة بـ AES-256 قبل مغادرة جهازك. خادم الم重新 لا يرى بياناتك أبداً كنص واضح. نشر الم重新 الخاص بك مجاناً مع Cloudflare Workers.",
    },
}

# Fix Arabic and some languages that have typos
SYNC_KEYS["ar"] = {
    "settings.sync": "المزامنة بين الأجهزة",
    "settings.syncDesc": "مزامنة مساحة العمل عبر الأجهزة عبر الإنترنت. تعمل في أي مكان — لا حاجة لـ WiFi.",
    "settings.syncRelay": "ناقل سحابي",
    "settings.syncRelayDesc": "تشفير ومزامنة بياناتك عبر خادم الناقل. فقط أجهزتك يمكنها قراءتها.",
    "settings.syncRelayUrl": "رابط خادم الناقل",
    "settings.syncInfo": "بياناتك مشفرة بـ AES-256 قبل مغادرة جهازك. خادم الناقل لا يرى بياناتك أبداً كنص واضح. نشر ناقل الخاص بك مجاناً مع Cloudflare Workers.",
}

SYNC_KEYS["nl"] = {
    "settings.sync": "Synchronisatie tussen apparaten",
    "settings.syncDesc": "Synchroniseer je werkruimte tussen apparaten via het internet. Werkt overal — geen WiFi nodig.",
    "settings.syncRelay": "Cloud-relay",
    "settings.syncRelayDesc": "Versleutel en synchroniseer je gegevens via een relayserver. Alleen je apparaten kunnen ze lezen.",
    "settings.syncRelayUrl": "Relayserver-URL",
    "settings.syncInfo": "Je gegevens worden versleuteld met AES-256 voordat ze je apparaat verlaten. De relayserver ziet je gegevens nooit in platte tekst. Implementeer je eigen relay gratis met Cloudflare Workers.",
}

SYNC_KEYS["sv"] = {
    "settings.sync": "Synkronisering mellan enheter",
    "settings.syncDesc": "Synka din arbetsyta mellan enheter via internet. Fungerar överallt — ingen WiFi behövs.",
    "settings.syncRelay": "Moln-relä",
    "settings.syncRelayDesc": "Kryptera och synka dina data via en reläserver. Bara dina enheter kan läsa dem.",
    "settings.syncRelayUrl": "Reläserver-URL",
    "settings.syncInfo": "Dina data krypteras med AES-256 innan de lämnar din enhet. Relärservern ser aldrig dina data i klartext. Implementera ditt eget relä gratis med Cloudflare Workers.",
}

def main():
    with open("src/lib/i18n.ts", "r", encoding="utf-8") as f:
        content = f.read()

    # For each language, add sync keys after the last settings.* key
    for lang, keys in SYNC_KEYS.items():
        # Find the last settings.* key in this language block
        # Pattern: find "settings.aboutDesc" or "settings.importFail" line in this language
        # and add after it
        
        # Find all occurrences of the last settings key patterns
        last_key = "settings.aboutDesc"
        # Find the line with this key for this language
        pattern = f'    "settings\\.aboutDesc": "[^"]*",'
        
        # For each language, find the first occurrence of settings.aboutDesc
        # We need to find it in the right language block
        # Let's find all positions of settings.aboutDesc
        positions = [(m.start(), m.end()) for m in re.finditer(r'"settings\.aboutDesc":\s*"[^"]*"', content)]
        
        if not positions:
            print(f"Warning: Could not find settings.aboutDesc for {lang}")
            continue
        
        # We need to find which position corresponds to which language
        # Languages are in order: en, es, fr, de, pt, it, nl, pl, tr, ja, ko, ru, hi, vi, id, th, sv, ar, zh
        lang_order = ["en", "es", "fr", "de", "pt", "it", "nl", "pl", "tr", "ja", "ko", "ru", "hi", "vi", "id", "th", "sv", "ar", "zh"]
        
        # Find language block starts
        lang_starts = []
        for lo in lang_order:
            m = re.search(rf'^  {lo}: \{{', content, re.MULTILINE)
            if m:
                lang_starts.append((lo, m.start()))
        
        # Find which language block each position belongs to
        for pos_start, pos_end in positions:
            # Find which language this position is in
            current_lang = None
            for lo, start in lang_starts:
                if pos_start >= start:
                    current_lang = lo
                else:
                    break
            
            if current_lang != lang:
                continue
            
            # Found the right position - insert sync keys after this line
            # Find end of line
            line_end = content.index("\n", pos_end)
            
            # Build the keys to insert
            key_lines = []
            for key, value in keys.items():
                key_lines.append(f'    "{key}": "{value}",')
            
            insert_text = "\n" + "\n".join(key_lines)
            
            content = content[:line_end] + insert_text + content[line_end:]
            print(f"Added {len(keys)} sync keys for {lang}")
            break
    
    with open("src/lib/i18n.ts", "w", encoding="utf-8") as f:
        f.write(content)
    
    print("Done!")

if __name__ == "__main__":
    main()
