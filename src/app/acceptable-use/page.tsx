import { LegalPage } from "@/components/legal-page";

export default function AcceptableUsePage() {
  return (
    <LegalPage title="Acceptable Use Policy" lastUpdated="July 23, 2026">
      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">1. Purpose</h2>
        <p>
          This Acceptable Use Policy outlines the rules and guidelines for using Lexis. As a free, non-profit tool,
          we aim to maintain a positive and productive environment for all users.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">2. Permitted Use</h2>
        <p className="mb-3">You may use Lexis for:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Personal productivity and organization</li>
          <li>Habit tracking and personal development</li>
          <li>Journaling and self-reflection</li>
          <li>Note-taking and knowledge management</li>
          <li>Task management and planning</li>
          <li>Mind mapping and visual thinking</li>
          <li>Any lawful purpose that does not violate these terms</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">3. Prohibited Use</h2>
        <p className="mb-3">You may not use Lexis for:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Storing or transmitting illegal content</li>
          <li>Harassment, bullying, or threatening others</li>
          <li>Violating any applicable laws or regulations</li>
          <li>Attempting to reverse-engineer, decompile, or exploit the application</li>
          <li>Using AI features for generating harmful, abusive, or deceptive content</li>
          <li>Overloading or disrupting the application's functionality</li>
          <li>Misrepresenting your identity or affiliation with Lexis</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">4. AI Feature Usage</h2>
        <p className="mb-3">
          The AI assistant accessed through OpenRouter is provided as a productivity aid. When using AI features:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Do not use AI to generate content that violates any laws</li>
          <li>Do not input sensitive personal data of others without consent</li>
          <li>AI responses are suggestions, not authoritative guidance</li>
          <li>You are responsible for how you use AI-generated content</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">5. Enforcement</h2>
        <p>
          As a local-first application with no accounts or centralized usage tracking, enforcement of this policy
          relies on your good faith. Abusive use of AI features may result in rate limiting by OpenRouter.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">6. Reporting Violations</h2>
        <p>
          If you encounter content or behavior within Lexis that violates this policy, please report it via the
          Buy Me a Coffee page. Since all data is local to each user, we cannot access or moderate content stored
          on individual devices.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">7. Changes to This Policy</h2>
        <p>
          We may update this policy as needed. Continued use of Lexis after changes constitutes acceptance of the
          updated policy.
        </p>
      </section>
    </LegalPage>
  );
}
