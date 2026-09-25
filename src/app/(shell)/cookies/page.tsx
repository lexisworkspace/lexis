import { LegalPage } from "@/components/legal-page";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy - Orleia",
  description: "Orleia uses no tracking cookies. What your browser stores locally, why, and how to clear it.",
  alternates: { canonical: "https://www.orleia.app/cookies" },
};

export default function CookiesPage() {
  return (
    <LegalPage title="Cookie Policy" lastUpdated="September 23, 2026">
      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">1. What Are Cookies?</h2>
        <p>
          Cookies are small text files stored on your device by websites you visit. They are widely used to make
          websites work more efficiently and provide information to site owners.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">2. How Orleia Uses Cookies</h2>
        <p className="mb-3">
          <strong>Orleia does not use tracking or advertising cookies.</strong> The application runs in your browser and
          stores your data in IndexedDB and localStorage, which are not cookies. We do not set, read, or track any
          cookies for advertising, profiling, or cross-site tracking.
        </p>
        <p>
          The site is hosted on Vercel, which may set a small number of strictly necessary technical cookies (for
          example load-balancing or security cookies such as Vercel's <em>_vcrcs</em>) to serve the application
          itself. These are essential to delivering the site and do not track you across other websites.
        </p>
        <p className="mt-3">
          Settings such as your language, theme, and optional profile are stored in the browser's localStorage - not
          in cookies - and never leave your device.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">3. Third-Party Cookies</h2>
        <p className="mb-3">
          The following third-party services used by Orleia may set cookies:
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
            <strong>Search providers</strong> - When you ask Noor to search the web, your query goes to keyless search
            providers (DuckDuckGo, Mojeek, Wikipedia, Bing RSS, Google News RSS) over server-to-server requests from
            our API; these requests do not involve your browser and cannot set cookies on your device.
          </li>
          <li>
            <strong>Vercel</strong> - May set strictly necessary technical cookies to serve and secure the site. See
            section 2.
          </li>
        </ul>
        <p className="mt-3">
          These services are loaded only when needed and are not essential to Orleia's core functionality.
        </p>
        <p className="mt-3">
          <strong>Consent for the one optional item.</strong> Everything Orleia stores is strictly necessary or
          first-party and local — except the anonymous Vercel Analytics counter. Because it is optional, it is
          opt-in: a consent banner loads <em>before</em> the analytics code does, with equal-prominence "Reject"
          and "Accept" buttons plus a "Customize" option for per-category choices. Until you allow it, the
          analytics code never loads and sends zero bytes; rejecting changes nothing about how Orleia works.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">4. Managing Cookies</h2>
        <p>
          You can control and manage cookies through your browser settings. Most browsers allow you to block or
          delete cookies entirely. Since Orleia itself does not use cookies, blocking cookies will not affect
          your ability to use the application.
        </p>
        <p className="mt-3">
          <strong>Cookies in Orleia Spark.</strong> Spark is a browser, so websites you visit set their own cookies —
          that is how the web works and it happens under each site's own policy, not ours. Spark's defaults are
          deliberately strict: third-party cookies are blocked everywhere, and private tabs run in a separate
          session whose cookies are discarded when the tab closes. You can clear all stored cookies and cached
          data at any time in Spark's Settings → "Clear browsing data" (bookmarks, clips and settings survive).
          Orleia never reads, profiles, or stores anything from the cookies your visited sites set.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-3">5. Your Choices</h2>
        <p className="mb-3">
          The consent banner offers three equal options: <strong>Reject</strong> (analytics never loads),
          <strong> Accept</strong> (the anonymous counter runs), or <strong>Customize</strong> — per-category
          toggles where strictly necessary storage is always on (Orleia cannot function without it) and
          everything else is off by default.
        </p>
        <p className="mb-3">
          Changed your mind later? Open <strong>Cookie settings</strong> from the footer of the landing page —
          the banner reopens in customize mode and your new choice applies immediately.
        </p>
        <p>
          Your decision is stored in your browser's localStorage — which, like all Orleia data, is not a cookie
          and never leaves your device. Clearing your browser storage resets the banner.
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
