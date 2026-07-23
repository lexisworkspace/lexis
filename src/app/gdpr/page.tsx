import { LegalPage } from "@/components/legal-page";

export default function GDPRPage() {
  return (
    <LegalPage
      title="GDPR & Data Processing"
      subtitle="General Data Protection Regulation compliance information for users in the European Economic Area."
      lastUpdated="July 23, 2026"
    >
      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">1. Data Controller</h2>
        <p>
          Lexis is an independent, non-profit project. As the application does not collect, store, or process
          personal data on any server, Lexis does not act as a data controller in the traditional sense. All
          data processing occurs locally on your device.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">2. Data We Collect</h2>
        <p>
          <strong>We collect no personal data.</strong> Lexis has no servers, databases, accounts, or analytics.
          All data you enter - habits, journal entries, notes, tasks, mind maps, and settings - is stored exclusively in
          your browser's IndexedDB and localStorage on your device.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">3. Lawful Basis for Processing</h2>
        <p>
          As we process no personal data, there is no lawful basis required. The data you create is processed
          locally by your own browser for the sole purpose of providing the application's functionality.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">4. Your GDPR Rights</h2>
        <p className="mb-3">Under the GDPR, you have the following rights, all of which are inherently respected:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li><strong>Right to Access</strong> - All your data is already on your device. Export it anytime via Settings.</li>
          <li><strong>Right to Rectification</strong> - Edit or delete any data directly within the application.</li>
          <li><strong>Right to Erasure</strong> - Clear your browser data or use the "Clear All Data" option in Settings.</li>
          <li><strong>Right to Data Portability</strong> - Export your workspace as JSON from Settings anytime.</li>
          <li><strong>Right to Object</strong> - Stop using the application at any time. No data remains with us.</li>
          <li><strong>Rights Related to Automated Decision-Making</strong> - AI features are optional and assistive, not decision-making.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">5. International Transfers</h2>
        <p>
          No personal data is transferred internationally because no personal data leaves your device. If you use
          AI features via OpenRouter, your prompts are sent to OpenRouter's servers which may be located outside
          the EEA. This is done with your explicit action (sending a message) and can be avoided by not using
          AI features.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">6. Data Processing Agreement (DPA)</h2>
        <p className="mb-3">
          As Lexis processes no personal data on its servers, a formal Data Processing Agreement is not required.
          For AI features via OpenRouter, the processing is governed by OpenRouter's own DPA.
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>OpenRouter acts as a data processor when you send prompts</li>
          <li>Prompts are not stored by OpenRouter after processing</li>
          <li>You can avoid this processing entirely by not using AI features</li>
          <li>All core tools (habits, journal, notes, tasks, mind maps) work fully offline without AI</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">7. Contact for GDPR Inquiries</h2>
        <p>
          For GDPR-related questions, reach out via the Buy Me a Coffee page. Since we process no personal data,
          formal Data Subject Access Requests are not applicable, but we are happy to address any concerns.
        </p>
      </section>
    </LegalPage>
  );
}
