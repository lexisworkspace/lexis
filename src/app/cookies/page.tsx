import { LegalPage } from "@/components/legal-page";

export default function CookiesPage() {
  return (
    <LegalPage title="Cookie Policy" lastUpdated="July 23, 2026">
      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">1. What Are Cookies?</h2>
        <p>
          Cookies are small text files stored on your device by websites you visit. They are widely used to make
          websites work more efficiently and provide information to site owners.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">2. How Lexis Uses Cookies</h2>
        <p className="mb-3">
          <strong>Lexis does not use any cookies.</strong> The application runs entirely in your browser and stores data
          exclusively in localStorage, which is not a cookie. We do not set, read, or track any cookies.
        </p>
        <p>
          Since Lexis has no servers, backend, or analytics, there is no mechanism for cookie-based tracking or
          session management. Your use of the application generates no cookies whatsoever.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">3. Third-Party Cookies</h2>
        <p className="mb-3">
          The following third-party services used by Lexis may set cookies:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            <strong>Google Fonts</strong> - The Google Fonts API may log requests and set cookies for analytics
            and CDN optimization. Google's handling of this data is governed by Google's Privacy Policy.
          </li>
          <li>
            <strong>OpenRouter</strong> - If you use AI features, OpenRouter may set cookies in accordance with
            their own cookie policy.
          </li>
        </ul>
        <p className="mt-3">
          These services are loaded only when needed and are not essential to Lexis's core functionality.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">4. Managing Cookies</h2>
        <p>
          You can control and manage cookies through your browser settings. Most browsers allow you to block or
          delete cookies entirely. Since Lexis itself does not use cookies, blocking cookies will not affect
          your ability to use the application.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">5. Changes to This Policy</h2>
        <p>
          Any changes to this Cookie Policy will be reflected with an updated "Last updated" date. Given our
          no-cookie design, significant changes are unlikely.
        </p>
      </section>
    </LegalPage>
  );
}
