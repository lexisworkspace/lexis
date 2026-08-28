#!/usr/bin/env python
"""Add sync keys to languages that are missing them."""
import re

SYNC_KEYS = {
    "pl": {
        "settings.sync": "Synchronizacja między urządzeniami",
        "settings.syncDesc": "Synchronizuj swój obszar roboczy między urządzeniami przez internet. Działa wszędzie — nie wymaga WiFi.",
        "settings.syncRelay": "Przekaźnik w chmurze",
        "settings.syncRelayDesc": "Szyfruj i synchronizuj dane przez serwer przekaźnikowy. Tylko Twoje urządzenia mogą je odczytać.",
        "settings.syncRelayUrl": "URL serwera przekaźnikowego",
        "settings.syncInfo": "Twoje dane są szyfrowane AES-256 przed opuszczeniem urządzenia. Serwer przekaźnikowy nigdy nie widzi Twoich danych w postaci tekstowej. Wdróż własny przekaźnik za darmo dzięki Cloudflare Workers.",
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
        "settings.syncRelayDesc": "Kryptera och synka dina data via en reläserver. Bara dina enheter kan läsa dem.",
        "settings.syncRelayUrl": "Reläserver-URL",
        "settings.syncInfo": "Dina data krypteras med AES-256 innan de lämnar din enhet. Relärservern ser aldrig dina data i klartext. Implementera ditt eget relä gratis med Cloudflare Workers.",
    },
    "ar": {
        "settings.sync": "المزامنة بين الأجهزة",
        "settings.syncDesc": "مزامنة مساحة العمل عبر الأجهزة عبر الإنترنت. تعمل في أي مكان — لا حاجة لـ WiFi.",
        "settings.syncRelay": "ناقل سحابي",
        "settings.syncRelayDesc": "تشفير ومزامنة بياناتك عبر خادم الناقل. فقط أجهزتك يمكنها قراءتها.",
        "settings.syncRelayUrl": "رابط خادم الناقل",
        "settings.syncInfo": "بياناتك مشفرة بـ AES-256 قبل مغادرة جهازك. خادم الناقل لا يرى بياناتك أبداً كنص واضح. نشر ناقل الخاص بك مجاناً مع Cloudflare Workers.",
    },
    "zh": {
        "settings.sync": "跨设备同步",
        "settings.syncDesc": "通过互联网在设备间同步你的工作空间。随处可用 — 不需要 WiFi。",
        "settings.syncRelay": "云中继",
        "settings.syncRelayDesc": "通过中继服务器加密和同步数据。只有你的设备可以读取。",
        "settings.syncRelayUrl": "中继服务器 URL",
        "settings.syncInfo": "你的数据在离开设备前使用 AES-256 加密。中继服务器永远看不到你的明文数据。使用 Cloudflare Workers 免费部署你自己的中继。",
    },
}

with open('src/lib/i18n.ts', 'r', encoding='utf-8') as f:
    content = f.read()

lang_order = ['en','es','fr','de','pt','it','nl','pl','tr','ja','ko','ru','hi','vi','id','th','sv','ar','zh']

for lang in lang_order:
    if lang not in SYNC_KEYS:
        continue
    
    # Check if already has sync keys
    m = re.search(rf'^  {lang}: \{{', content, re.MULTILINE)
    if not m:
        print(f'{lang}: BLOCK NOT FOUND, skipping')
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
    if 'settings.sync' in block:
        print(f'{lang}: already has sync keys, skipping')
        continue
    
    # Find the last line before the closing }, of this language block
    # Look for the last }, before the next language block
    last_brace = content.rfind('},', block_start, next_block)
    if last_brace == -1:
        print(f'{lang}: Could not find closing brace, skipping')
        continue
    
    # Insert sync keys before the last },
    key_lines = []
    for key, value in SYNC_KEYS[lang].items():
        key_lines.append(f'    "{key}": "{value}",')
    
    insert_text = "\n" + "\n".join(key_lines) + "\n"
    content = content[:last_brace] + insert_text + "  " + content[last_brace:]
    
    print(f'{lang}: added {len(SYNC_KEYS[lang])} sync keys')

with open('src/lib/i18n.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
