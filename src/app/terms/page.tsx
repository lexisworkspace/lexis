import { LegalPage } from "@/components/legal-page";

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" lastUpdated="August 21, 2026">
      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">1. Acceptance of Terms</h2>
        <p>
          By using Lexis, you agree to these Terms of Service. If you do not agree, do not use the application.
          Lexis is provided as a free, non-profit productivity tool. By using Lexis, you confirm that you are at least 13 years old. Lexis is not directed at, and may not be used by, anyone under 13.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">2. Description of Service</h2>
        <p className="mb-3">
          Lexis is a browser-based productivity suite including tools for habits tracking, mindfulness journaling, note-taking, task management,
          spreadsheet management, and AI-powered assistance. Key characteristics:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>All data is stored locally in your browser's IndexedDB and localStorage</li>
          <li>No accounts, servers, or cloud storage are involved</li>
          <li>The application is fully client-side</li>
          <li>An optional local password for device-level privacy</li>
          <li>AI features are optional and use NVIDIA’s NIM API</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">3. Optional Password</h2>
        <p className="mb-3">
          Lexis offers an optional local password feature. This is not an account system - the password is stored
          only on your device. You are responsible for:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Remembering your password (it cannot be recovered by us)</li>
          <li>Understanding that resetting the password does not delete your data</li>
          <li>Recognizing that this is a device-level lock, not a secure authentication system</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">4. No Data Collection</h2>
        <p>
          Lexis does not collect, store, or transmit any personal data. We have no servers, no databases, and no
          analytics. The application has no backend to receive data.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">5. Optional Profile Information</h2>
        <p className="mb-3">
          During setup, Lexis may ask you for optional "about you" information - such as your name, pronouns, age
          range, time zone, work situation, interests, schedule, preferences, and goals. All of this information is
          <strong> entirely optional</strong> and can be skipped.
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>It is stored only on your device, alongside the rest of your workspace data</li>
          <li>It is never uploaded, sold, or shared with any third party</li>
          <li>It is shared with Noor, Lexis's built-in AI assistant, so it can personalize its help; when you chat with Noor, your profile is sent to Noor's AI provider (NVIDIA) alongside your message for processing, under the same terms as your other chat content (see the Privacy Policy)</li>
          <li>You can leave every field empty and still use all of Lexis</li>
          <li>You can review or change this information at any time during setup or by clearing your browser data</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">6. User Responsibilities</h2>
        <p className="mb-3">You are responsible for:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Maintaining backups of your data via the export feature</li>
          <li>Your own API key if you choose to use one for AI features</li>
          <li>Understanding that clearing browser data will delete your workspace</li>
          <li>Using the AI features responsibly and in accordance with NVIDIA's terms</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">7. Intellectual Property</h2>
        <p>
          The Lexis name, logo, and application code are provided as an open, non-profit project. The content you
          create within Lexis is entirely your own. We claim no ownership over your data or content.
        </p>
        <p className="mt-3">
          <strong>Affiliation disclaimer.</strong> Lexis is an independent, non-profit project. It is not affiliated
          with, sponsored by, or endorsed by LexisNexis, RELX Group, or any of their subsidiaries.
          LEXISNEXIS and RELX GROUP are trademarks of their respective owners.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">8. Third-Party Services</h2>
        <p className="mb-3">Lexis integrates with the following third-party services:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li><strong>NVIDIA NIM API</strong> - Provides Noor's AI model access. Subject to NVIDIA's own terms.</li>
          <li><strong>Web search</strong> - When you ask Noor to search the web, your query is sent to a third-party search provider (Bing) to fetch results. No workspace data is included.</li>
          <li><strong>Google Fonts</strong> - Provides typography. Subject to Google's privacy policy.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">9. Disclaimer of Warranties</h2>
        <p>
          Lexis is provided "as is" without warranty of any kind. We do not guarantee uninterrupted service or
          that your data will be preserved. Please maintain regular backups.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">10. Limitation of Liability</h2>
        <p>
          In no event shall Lexis be liable for any damages arising from use of the application, including data loss.
          Since all data is stored locally, data loss can only occur due to browser actions on your end.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">11. Changes to Terms</h2>
        <p>
          We reserve the right to update these terms. Continued use after changes constitutes acceptance. The
          "Last updated" date reflects the most recent revision.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">12. Governing Law</h2>
        <p>
          These terms shall be governed by applicable local laws. Given that Lexis is a non-profit tool with no
          commercial activity, disputes are expected to be minimal.
        </p>
      </section>
    </LegalPage>
  );
}
