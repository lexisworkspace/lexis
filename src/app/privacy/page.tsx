import { LegalPage } from "@/components/legal-page";
import { LEXIS_EMAIL, GMAIL_COMPOSE_HREF } from "@/lib/contact";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="August 21, 2026">
      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">1. Introduction</h2>
        <p>
          Lexis is built on a fundamental belief: your data belongs to you. This Privacy Policy explains how Lexis
          handles your information. Lexis is designed as a local-first, non-profit productivity tool. We do not operate
          servers, maintain databases, or collect personal data.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">2. Data Storage & Location</h2>
        <p className="mb-3">
          <strong>Everything is local.</strong> All data you create within Lexis is stored exclusively in your browser's
          IndexedDB and localStorage. This means:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Your data never leaves your device</li>
          <li>No servers receive or store your information</li>
          <li>No accounts or cloud storage are involved</li>
          <li>Clearing your browser data will erase your Lexis workspace</li>
          <li>Exporting a backup is your responsibility (we provide the tools)</li>
        </ul>
        <p className="mt-3">
          <strong>Optional "about you" profile.</strong> During setup, Lexis may ask optional questions about you
          (name, pronouns, age range, time zone, work situation, interests, schedule, preferences, and goals). Every
          field can be skipped. This profile is stored only on your device in the same local storage as the rest of
          your workspace, is never uploaded or shared, and is only ever sent to a third party if you explicitly
          include it in a message to Noor.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">3. Optional Password Protection</h2>
        <p className="mb-3">
          Lexis offers an <strong>optional</strong> local password feature. This is entirely optional - you can use
          the full app without setting one. If you choose to set a password:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>The password is stored only on your device in localStorage</li>
          <li>It is never sent to any server or third party</li>
          <li>It cannot be recovered if lost - only your data can be preserved by resetting it</li>
          <li>It acts as a simple lock, not an account system</li>
          <li>You can reset it at any time from the lock screen</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">4. Noor AI & NVIDIA NIM</h2>
        <p className="mb-3">
          Lexis integrates with NVIDIA’s NIM API to power Noor, its built-in AI assistant. Noor offers three models - Ethos 4.7 (deep reasoning), Logos 4.5 (balanced everyday intelligence), and Verse 4 (fast, lightweight responses). When you use Noor:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Your prompts and relevant context are sent to NVIDIA’s NIM API for processing</li>
          <li>If you filled in the optional "about you" profile during setup, it is included in that context so Noor can personalize its help (for example, using your name, time zone, or goals). It is never shared with anyone else, and you can leave it empty</li>
          <li>This data is transmitted to NVIDIA for processing and is handled under NVIDIA’s API terms; Lexis does not store it, but we cannot control NVIDIA’s internal logging</li>
          <li>You can bring your own API key for full control</li>
          <li>AI features are optional - all core tools work without them</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">5. Voice Input & Speech Recognition</h2>
        <p className="mb-3">
          Voice dictation in Noor lets you speak to your assistant. When you use the microphone, your
          audio is recorded locally on your device and sent to NVIDIA's NIM API, where it is transcribed
          to text using Whisper (speech-to-text). Lexis does not store your audio recordings.
        </p>
        <p className="mb-3">
          As with text input, this data is transmitted temporarily to NVIDIA for processing and is handled under NVIDIA’s API terms (see section 4). Lexis does not store the audio or transcripts, and we cannot control NVIDIA’s internal logging. The transcribed text is handled exactly like text you type -
          it stays on your device and is only sent to NVIDIA's NIM API again when you choose to send it
          as a message to Noor. You can revoke microphone access at any time through your browser's
          site permissions.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">6. Analytics & Tracking</h2>
        <p>
          Lexis uses zero analytics, zero cookies, and zero tracking. We do not collect, measure, or monitor how you
          use the application. There are no embedded third-party scripts, no analytics services, and no telemetry.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">7. Third-Party Services</h2>
        <p className="mb-3">
          Lexis itself has no third-party dependencies that process your personal data. The only external service
          integrations are:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li><strong>NVIDIA NIM API</strong> - Powers Noor’s AI features (optional). See section 4 for details.</li>
          <li><strong>Bing web search</strong> - When you ask Noor to search the web, only your query is sent to Microsoft Bing to fetch results. No workspace data is included.</li>
          <li><strong>Google Fonts</strong> - Loaded from the Google Fonts CDN for typography.</li>
          <li><strong>NVIDIA NIM (Whisper)</strong> - Transcribes your voice when you use voice dictation. See sections 4 and 5.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">8. Data Export & Deletion</h2>
        <p>
          Since we don't store your data, there's nothing for us to delete. You can export your entire workspace as
          JSON from the Settings page, or clear your browser data to remove everything. Individual notes can be
          exported as .docx files.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">9. Children's Privacy</h2>
        <p className="mb-3">
          Lexis is intended for users aged <strong>13 and older</strong>. During setup, Lexis asks you to confirm you
          are 13 or older, and you may not use Lexis if you are under 13.
        </p>
        <p>
          We do not knowingly collect any personal information from children or minors. Because all data is stored on
          your own device and never sent to us, Lexis has no mechanism to receive or process children's data.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">10. Contact</h2>
        <p>
          For privacy-related questions, email us at{" "}
          <a href={GMAIL_COMPOSE_HREF} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-primary transition-colors">
            {LEXIS_EMAIL}
          </a>{" "}
          (opens Gmail), reach out via the Buy Me a Coffee page, or open an issue on our GitHub repository.
        </p>
      </section>
      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">11. Trademark Disclaimer</h2>
        <p>
          Lexis is an independent, non-profit project. It is not affiliated with, sponsored by, or
          endorsed by LexisNexis, RELX Group, or any of their subsidiaries. LEXISNEXIS and RELX GROUP
          are trademarks of their respective owners.
        </p>
      </section>
        </LegalPage>
  );
}
