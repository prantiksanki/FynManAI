import { useNavigate } from 'react-router-dom';
import './LegalPage.css';

function Section({ title, children }) {
  return (
    <section className="legal-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function PrivacyPolicy() {
  const navigate = useNavigate();
  return (
    <div className="legal-root">
      <div className="legal-mesh" aria-hidden="true">
        <div className="legal-orb legal-orb--1" />
        <div className="legal-orb legal-orb--2" />
      </div>

      <header className="legal-header">
        <button className="legal-back" onClick={() => navigate('/')}>← FynmanAI</button>
      </header>

      <main className="legal-container">
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: September 5, 2026</p>

        <Section title="1. Overview">
          <p>
            FynmanAI ("we", "us", "our") provides an AI-powered visual canvas that turns your prompts
            into interactive explanations. This Privacy Policy describes what information we collect,
            how we use it, and the choices you have.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <ul>
            <li><strong>Account information:</strong> When you sign in with Google, we receive your name, email address, and profile picture from Google OAuth.</li>
            <li><strong>Usage content:</strong> Prompts you submit, generated canvas timelines, and saved sessions, stored so you can resume past work.</li>
            <li><strong>Technical data:</strong> Basic request metadata (e.g. browser type, IP address) collected automatically for security and reliability.</li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Information">
          <ul>
            <li>To authenticate you and maintain your session.</li>
            <li>To generate, store, and let you resume your canvas sessions.</li>
            <li>To generate voice narration and fetch supporting images/videos for your prompts via third-party providers.</li>
            <li>To improve reliability, performance, and the quality of AI-generated output.</li>
          </ul>
        </Section>

        <Section title="4. Third-Party Services">
          <p>We rely on the following third-party services to operate FynmanAI:</p>
          <ul>
            <li><strong>Google OAuth</strong> — authentication</li>
            <li><strong>OpenRouter / Anthropic Claude</strong> — AI canvas generation</li>
            <li><strong>OpenAI</strong> — text-to-speech voice narration</li>
            <li><strong>Unsplash, Pexels, Pixabay, Wikipedia</strong> — supporting images and video clips</li>
            <li><strong>MongoDB</strong> — storage of your sessions and canvas data</li>
          </ul>
          <p>Each of these providers processes limited data solely to deliver the corresponding feature.</p>
        </Section>

        <Section title="5. Data Storage & Retention">
          <p>
            Session data (prompts, timelines, canvas snapshots) is stored in our database and linked to
            your account until you delete it. Generated audio files are temporary and automatically
            removed from our servers after one hour.
          </p>
        </Section>

        <Section title="6. Your Choices">
          <ul>
            <li>You may delete individual sessions at any time from your dashboard.</li>
            <li>You may sign out at any time, which removes your local session cookie.</li>
            <li>You may request deletion of your account and associated data by contacting us.</li>
          </ul>
        </Section>

        <Section title="7. Security">
          <p>
            We use industry-standard measures to protect your data, including encrypted connections
            (HTTPS) and access-controlled storage. No method of transmission or storage is 100% secure,
            but we work to protect your information.
          </p>
        </Section>

        <Section title="8. Children's Privacy">
          <p>FynmanAI is not directed to children under 13, and we do not knowingly collect data from them.</p>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. Changes will be posted on this page
            with an updated "Last updated" date.
          </p>
        </Section>

        <Section title="10. Contact Us">
          <p>
            If you have questions about this Privacy Policy, please contact us at{' '}
            <a href="mailto:support@fynman.xyz">support@fynman.xyz</a>.
          </p>
        </Section>
      </main>
    </div>
  );
}

export function TermsOfService() {
  const navigate = useNavigate();
  return (
    <div className="legal-root">
      <div className="legal-mesh" aria-hidden="true">
        <div className="legal-orb legal-orb--1" />
        <div className="legal-orb legal-orb--2" />
      </div>

      <header className="legal-header">
        <button className="legal-back" onClick={() => navigate('/')}>← FynmanAI</button>
      </header>

      <main className="legal-container">
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: September 5, 2026</p>

        <Section title="1. Acceptance of Terms">
          <p>
            By accessing or using FynmanAI (the "Service"), you agree to be bound by these Terms of
            Service. If you do not agree, do not use the Service.
          </p>
        </Section>

        <Section title="2. Description of Service">
          <p>
            FynmanAI lets you submit natural-language prompts and generates an interactive visual
            canvas with AI-authored content, images, video, and voice narration. Output is generated
            automatically by third-party AI models and may not always be fully accurate.
          </p>
        </Section>

        <Section title="3. Accounts">
          <p>
            You must sign in with a valid Google account to use the Service. You are responsible for
            all activity that occurs under your account.
          </p>
        </Section>

        <Section title="4. Acceptable Use">
          <ul>
            <li>You will not use the Service for any unlawful, harmful, or abusive purpose.</li>
            <li>You will not attempt to disrupt, reverse-engineer, or overload the Service.</li>
            <li>You will not use the Service to generate content that infringes on others' rights.</li>
          </ul>
        </Section>

        <Section title="5. AI-Generated Content">
          <p>
            Canvas content, narration, and imagery are generated automatically by AI models and
            third-party media providers. FynmanAI does not guarantee the accuracy, completeness, or
            suitability of any generated content, particularly for financial decisions. Nothing
            produced by the Service constitutes financial, legal, or investment advice.
          </p>
        </Section>

        <Section title="6. Your Content">
          <p>
            You retain ownership of the prompts you submit. By using the Service, you grant us a
            limited license to process your prompts and store resulting sessions solely to provide
            the Service to you.
          </p>
        </Section>

        <Section title="7. Availability">
          <p>
            The Service is provided on an "as is" and "as available" basis. We may modify, suspend, or
            discontinue any part of the Service at any time without liability.
          </p>
        </Section>

        <Section title="8. Limitation of Liability">
          <p>
            To the fullest extent permitted by law, FynmanAI shall not be liable for any indirect,
            incidental, or consequential damages arising from your use of the Service, including
            decisions made based on AI-generated content.
          </p>
        </Section>

        <Section title="9. Termination">
          <p>
            We may suspend or terminate your access to the Service at any time if you violate these
            Terms.
          </p>
        </Section>

        <Section title="10. Changes to These Terms">
          <p>
            We may update these Terms from time to time. Continued use of the Service after changes
            constitutes acceptance of the updated Terms.
          </p>
        </Section>

        <Section title="11. Contact Us">
          <p>
            Questions about these Terms? Contact us at{' '}
            <a href="mailto:support@fynman.xyz">support@fynman.xyz</a>.
          </p>
        </Section>
      </main>
    </div>
  );
}
