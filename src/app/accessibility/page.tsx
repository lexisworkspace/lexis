import { LegalPage } from "@/components/legal-page";

export default function AccessibilityPage() {
  return (
    <LegalPage
      title="Accessibility Statement"
      subtitle="Our commitment to making Lexis usable for everyone."
      lastUpdated="July 19, 2026"
    >
      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">1. Our Commitment</h2>
        <p>
          Lexis is committed to ensuring digital accessibility for people with disabilities. We believe that
          productivity tools should be available to everyone, regardless of ability. We are continually improving
          the user experience and applying relevant accessibility standards.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">2. Accessibility Features</h2>
        <p className="mb-3">Lexis incorporates the following accessibility features:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li><strong>Focus Indicators</strong> - Visible focus rings on all interactive elements</li>
          <li><strong>Font Size Options</strong> - Adjustable font sizes in Settings (Small, Medium, Large)</li>
          <li><strong>ARIA Labels</strong> - Semantic HTML and ARIA attributes where appropriate</li>
          <li><strong>Color Contrast</strong> - High-contrast dark theme as default with custom theme support</li>
          <li><strong>Semantic Structure</strong> - Proper heading hierarchy and landmark regions</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">3. Standards</h2>
        <p>
          We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">4. Known Limitations</h2>
        <p className="mb-3">
          As a local-first application with no backend, some accessibility features have inherent limitations:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Screen reader support depends on your browser's capabilities</li>
          <li>Custom UI components may not be fully accessible with all assistive technologies</li>
          <li>The application is not tested with all available screen readers</li>
          <li>Some visual features (charts, heatmaps) may not have full text alternatives</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">5. Ongoing Improvements</h2>
        <p>
          We are committed to improving accessibility with each update. Planned improvements include better screen
          reader support for charts and analytics, improved focus management in modals, and enhanced keyboard
          navigation for complex interfaces.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">6. Feedback</h2>
        <p>
          We welcome your feedback on the accessibility of Lexis. If you encounter accessibility barriers or have
          suggestions for improvement, please reach out via the Buy Me a Coffee page or the project repository.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">7. Compatibility</h2>
        <p className="mb-3">Lexis is designed to work with:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Modern browsers (Chrome, Firefox, Safari, Edge)</li>
          <li>Operating system accessibility features (screen readers, zoom, high contrast mode)</li>
          <li>Keyboard-only navigation</li>
          <li>Mobile devices with responsive layout</li>
        </ul>
      </section>
    </LegalPage>
  );
}
