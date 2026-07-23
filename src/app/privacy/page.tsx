import { LegalPage } from "@/components/legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="July 23, 2026">
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
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">3. Optional Password Protection</h2>
        <p className="mb-3">
          Lexis offers an <strong>optional</strong> local password feature. This is entirely optional — you can use
          the full app without setting one. If you choose to set a password:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>The password is stored only on your device in localStorage</li>
          <li>It is never sent to any server or third party</li>
          <li>It cannot be recovered if lost — only your data can be preserved by resetting it</li>
          <li>It acts as a simple lock, not an account system</li>
          <li>You can reset it at any time from the lock screen</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">4. AI Processing & OpenRouter</h2>
        <p className="mb-3">
          Lexis integrates with OpenRouter to provide AI-powered features. When you use the AI assistant:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Your prompts and relevant context are sent to OpenRouter for processing</li>
          <li>This data is transmitted temporarily and is not stored by OpenRouter</li>
          <li>You can bring your own API key for full control</li>
          <li>AI features are optional — all core tools work without them</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">5. Analytics & Tracking</h2>
        <p>
          Lexis uses zero analytics, zero cookies, and zero tracking. We do not collect, measure, or monitor how you
          use the application. There are no embedded third-party scripts, no analytics services, and no telemetry.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">6. Third-Party Services</h2>
        <p className="mb-3">
          Lexis itself has no third-party dependencies that process your personal data. The only external service
          integrations are:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li><strong>OpenRouter</strong> — Used for AI features (optional). See section 4 for details.</li>
          <li><strong>Google Fonts</strong> — Loaded from the Google Fonts CDN for typography.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">7. Data Export & Deletion</h2>
        <p>
          Since we don't store your data, there's nothing for us to delete. You can export your entire workspace as
          JSON from the Settings page, or clear your browser data to remove everything. Individual notes can be
          exported as .docx files.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">8. Children's Privacy</h2>
        <p>
          Lexis does not knowingly collect any personal information from children under 13. As no data collection
          occurs at all, there is no risk of inadvertent collection.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">9. Contact</h2>
        <p>
          For privacy-related questions, reach out via the Buy Me a Coffee page or open an issue on our GitHub repository.
        </p>
      </section>
    </LegalPage>
  );
}
