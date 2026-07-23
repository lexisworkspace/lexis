import { LegalPage } from "@/components/legal-page";

export default function DisclaimerPage() {
  return (
    <LegalPage title="Disclaimer" lastUpdated="July 23, 2026">
      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">1. General Information</h2>
        <p>
          Lexis is provided as a free, non-profit productivity tool. The information and functionality within the
          application are provided for general informational and organizational purposes only. While we strive for
          accuracy and reliability, we make no representations or warranties of any kind.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">2. No Professional Advice</h2>
        <p>
          Lexis is not a substitute for professional advice, including but not limited to medical, legal, financial,
          or mental health advice. Productivity tools and AI-generated suggestions should not be relied upon as
          professional guidance. Always consult qualified professionals for advice in these areas.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">3. AI-Generated Content</h2>
        <p className="mb-3">
          Lexis uses AI models accessed through OpenRouter to provide suggestions, analysis, and reflections.
          AI-generated content:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>May contain inaccuracies, errors, or omissions</li>
          <li>Should not be taken as fact without verification</li>
          <li>Reflects patterns in training data, not objective truth</li>
          <li>Is provided as a productivity aid, not authoritative guidance</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">4. Data Loss</h2>
        <p>
          Since all Lexis data is stored in your browser's localStorage, it is subject to deletion if you clear
          your browser data, switch devices, or use private browsing modes. We strongly recommend using the
          built-in export feature to maintain regular backups. Lexis is not responsible for data loss.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">5. No Warranty</h2>
        <p>
          Lexis is provided "as is" without any warranty, express or implied. We do not guarantee that the
          application will be uninterrupted, secure, error-free, or that defects will be corrected. Use of the
          application is at your own risk.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">6. Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, Lexis shall not be liable for any direct, indirect, incidental,
          special, consequential, or punitive damages arising from your use of the application.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">7. External Links</h2>
        <p>
          Lexis may contain links to third-party websites (Buy Me a Coffee, OpenRouter). We have no control over
          and assume no responsibility for the content, privacy policies, or practices of these sites.
        </p>
      </section>
    </LegalPage>
  );
}
