import LegalPage from "@/modules/legal/components/legal-page";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

export const metadata = { title: "Terms of Service", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="21 October 2026">
      <p>
        These terms govern your use of {SITE_NAME} (the &quot;Service&quot;). By creating an account or using the Service
        you agree to them.
      </p>

      <h2>1. The Service</h2>
      <p>
        {SITE_NAME} turns text prompts and images into web applications using AI. Generated apps run in temporary cloud
        sandboxes and can be edited, downloaded, shared, pushed to GitHub or published to Vercel from your account.
      </p>

      <h2>2. Your account</h2>
      <p>
        You must give accurate information when you sign up and keep your sign-in details secure. You are responsible for
        everything done with your account. You must be old enough to form a binding contract where you live.
      </p>

      <h2>3. Plans, credits and payment</h2>
      <p>
        Each generation uses one credit. The free plan includes a limited number of credits per 30 days; paid plans
        include more. Paid plans are billed in advance through our payment provider and renew until cancelled. Unused
        credits do not roll over. A credit is refunded automatically when a generation fails.
      </p>

      <h2>4. Your content</h2>
      <p>
        You keep ownership of your prompts, uploaded images and the code generated for you. You give us the permission
        we need to store, process and display that content to provide the Service, including sending it to our AI and
        hosting providers. You are responsible for making sure you have the right to use anything you upload.
      </p>

      <h2>5. Acceptable use</h2>
      <p>You agree not to use the Service to:</p>
      <ul>
        <li>build or host malware, phishing pages or anything illegal;</li>
        <li>impersonate another person or organisation, or infringe anyone&apos;s rights;</li>
        <li>attack, overload or try to get around the limits or security of the Service or its sandboxes;</li>
        <li>resell or share access to the Service without our permission.</li>
      </ul>
      <p>We may suspend or close accounts that break these rules.</p>

      <h2>6. AI output</h2>
      <p>
        Generated code may contain errors, security issues or content similar to existing works. Review and test it
        before relying on it. You are responsible for apps you publish.
      </p>

      <h2>7. Third-party services</h2>
      <p>
        Publishing to Vercel and pushing to GitHub happen through those services and are also subject to their terms.
      </p>

      <h2>8. Disclaimer and liability</h2>
      <p>
        The Service is provided &quot;as is&quot; without warranties of any kind. To the extent the law allows, we are not
        liable for indirect or consequential losses, and our total liability is limited to the amount you paid us in the
        12 months before the claim.
      </p>

      <h2>9. Changes and termination</h2>
      <p>
        We may change these terms or the Service. We will tell you about material changes before they take effect. You
        can stop using the Service and delete your account at any time.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
