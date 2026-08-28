import { LegalPage } from "@/components/legal-page";

export default function CookiesPage() {
  return (
    <LegalPage title="Cookie Policy" lastUpdated="August 21, 2026">
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
        <p className="mt-3">
          Settings such as your language, theme, and optional profile are stored in the browser's localStorage - not
          in cookies - and never leave your device.
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
            <strong>NVIDIA NIM API</strong> - If you use Noor’s AI features, NVIDIA may set cookies in accordance with
            their own cookie policy.
          </li>
          <li>
            <strong>Bing web search</strong> - When you ask Noor to search the web, Microsoft Bing may set cookies in
            accordance with its own policies. Only your search query is sent.
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
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">5. On-Site Cookie Notice</h2>
        <p className="mb-3">
          The Lexis landing page (lexisapp.xyz) displays a brief, honest notice stating that Lexis sets no
          cookies and that your data stays in your browser. It is shown once and can be dismissed with a
          single click. The dismissal is remembered in your browser's localStorage - which, like all Lexis
          data, is not a cookie and never leaves your device.
        </p>
        <p>
          No consent banner with "Accept all" or "Reject all" options is required or displayed, because there
          are no non-essential cookies to accept or reject. The notice exists purely so visitors know exactly
          what Lexis does - and does not - store.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">6. Changes to This Policy</h2>
        <p>
          Any changes to this Cookie Policy will be reflected with an updated "Last updated" date. Given our
          no-cookie design, significant changes are unlikely.
        </p>
      </section>
    </LegalPage>
  );
}
