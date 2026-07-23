import { LegalPage } from "@/components/legal-page";

export default function EulaPage() {
  return (
    <LegalPage title="End User License Agreement" lastUpdated="July 23, 2026">
      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">1. Grant of License</h2>
        <p>
          Lexis is provided as a free, non-profit application. You are granted a non-exclusive, non-transferable,
          revocable license to use the application for personal, non-commercial purposes. This license is provided
          free of charge.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">2. Ownership</h2>
        <p className="mb-3">
          The Lexis application, including its code, design, branding, and logo, is owned by the project maintainer.
          This license does not grant you any ownership rights to the application itself.
        </p>
        <p>
          Content you create within Lexis - including habits, journal entries, notes, tasks, and settings - remains
          your sole property. Lexis claims no ownership over your data or content.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">3. Permitted Uses</h2>
        <p className="mb-3">Under this license, you may:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Use Lexis for personal productivity and organization</li>
          <li>Access all features without payment or subscription</li>
          <li>Export and use your data outside the application</li>
          <li>Share Lexis with others (the application, not your data)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">4. Restrictions</h2>
        <p className="mb-3">You may not:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Sell, redistribute, or sublicense the Lexis application</li>
          <li>Modify, decompile, or reverse-engineer the application</li>
          <li>Remove or alter any copyright or branding notices</li>
          <li>Use Lexis to provide a commercial service</li>
          <li>Claim ownership or authorship of the Lexis application</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">5. Updates and Modifications</h2>
        <p>
          Lexis may be updated from time to time. Updates are provided at no cost. The project maintainer reserves
          the right to modify, suspend, or discontinue the application at any time without notice.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">6. Termination</h2>
        <p>
          This license is effective until terminated. It terminates automatically if you violate any terms. Upon
          termination, you must cease all use of the application. Your data remains on your device.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">7. Open Source Status</h2>
        <p>
          While Lexis is shared as an open, non-profit project, specific open source licensing terms may apply to
          the source code. The application is provided "as visible" - users are encouraged to explore, learn from,
          and contribute to the project within the bounds of applicable intellectual property laws.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">8. Governing Law</h2>
        <p>
          This EULA shall be governed by applicable local laws. Any disputes shall be resolved in the competent
          courts of the jurisdiction.
        </p>
      </section>
    </LegalPage>
  );
}
