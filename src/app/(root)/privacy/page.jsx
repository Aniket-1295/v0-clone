import LegalPage from "@/modules/legal/components/legal-page";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

export const metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="21 October 2026">
      <p>This policy explains what personal data {SITE_NAME} collects, why, and who it is shared with.</p>

      <h2>1. What we collect</h2>
      <ul>
        <li>
          <strong>Account data</strong>: your name, email address and profile image, from sign-up or the sign-in
          provider you choose.
        </li>
        <li>
          <strong>Content</strong>: prompts, images you attach, generated code, chat history and environment variables
          you add to a chat (stored encrypted).
        </li>
        <li>
          <strong>Billing data</strong>: your plan and payment status. Card details are handled by our payment provider
          and never reach our servers.
        </li>
        <li>
          <strong>Connected accounts</strong>: if you connect GitHub, your GitHub username and an access token (stored
          encrypted) used only to push code you ask us to push.
        </li>
        <li>
          <strong>Technical data</strong>: logs and error reports (browser, device, pages visited, errors) used to keep
          the Service working.
        </li>
      </ul>

      <h2>2. How we use it</h2>
      <p>
        To provide the Service (generate, preview, store and publish your apps), to manage your account and credits, to
        prevent abuse, and to fix errors. We do not sell your personal data.
      </p>

      <h2>3. Who we share it with</h2>
      <p>We use these processors to run the Service:</p>
      <ul>
        <li>Clerk: sign-in, user accounts and billing.</li>
        <li>Google (Gemini API): your prompts, images and code are sent to the AI model to generate apps.</li>
        <li>E2B: cloud sandboxes that build and run your apps.</li>
        <li>Neon: the database that stores your account and content.</li>
        <li>Inngest: runs generation jobs in the background.</li>
        <li>Vercel: hosting for this site and for apps you publish.</li>
        <li>GitHub: only when you push an app to your own GitHub account.</li>
        <li>Sentry: error monitoring.</li>
      </ul>

      <h2>4. Retention</h2>
      <p>
        We keep your data while your account is active. When you delete a chat, project or your account, the related
        data is deleted from our database. Backups and logs are removed on their normal schedule.
      </p>

      <h2>5. Your rights</h2>
      <p>
        Depending on where you live, you can ask to access, correct, export or delete your personal data, or object to
        how we use it. Contact us at the address below.
      </p>

      <h2>6. Cookies</h2>
      <p>
        We use cookies that are needed for sign-in and to remember settings such as the sidebar state. We do not use
        advertising cookies.
      </p>

      <h2>7. Contact</h2>
      <p>
        Privacy questions or requests: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
