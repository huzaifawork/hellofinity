import { useNavigate } from 'react-router-dom'

export default function PrivacyScreen() {
  const navigate = useNavigate()
  function back() { navigate(-1) }

  return (
    <div className="privacy-screen">
      <div className="privacy-header">
        <button className="back-btn" onClick={back}>← Back</button>
        <div className="privacy-header-title">Privacy Policy</div>
      </div>
      <div className="privacy-body">
        <h2>Privacy Policy</h2>
        <p className="privacy-updated">Last updated: January 2025</p>

        <h3>The short version</h3>
        <p>HelloFinity is built with your privacy in mind. We collect only what we need to run the service, we never sell your data, and we keep things simple.</p>

        <h3>What we collect</h3>
        <p>We collect your email address (to send you a magic sign-in link), your first name (optional, for personalisation), and your challenge progress data (which envelopes/weeks/days you've completed). We also log the dates and times of challenge events so we can show you your history.</p>

        <h3>What we don't collect</h3>
        <p>We don't collect payment information (handled by Stripe), passwords (we use passwordless auth), or any tracking/advertising data. We don't use cookies beyond what's strictly necessary for authentication.</p>

        <h3>How we use your data</h3>
        <p>Your data is used only to provide the HelloFinity service — syncing your progress across devices, sending you sign-in links, and showing you your challenge history. We don't use it for marketing or share it with third parties (except as described below).</p>

        <h3>Third-party services</h3>
        <p>We use <strong>Supabase</strong> for authentication and database storage. Your data is stored securely in a Supabase-managed PostgreSQL database in the EU. Supabase's privacy policy applies to data processed by their infrastructure.</p>

        <h3>Data retention</h3>
        <p>We keep your data for as long as you have an active account. You can delete your account at any time from the settings menu, which will permanently remove all your data.</p>

        <h3>Your rights</h3>
        <p>You have the right to access, correct, or delete your personal data at any time. To exercise these rights, use the in-app account deletion feature or email us at <a href="mailto:hello@hellofinity.com">hello@hellofinity.com</a>.</p>

        <h3>Contact</h3>
        <p>Questions about privacy? Email us at <a href="mailto:hello@hellofinity.com">hello@hellofinity.com</a>.</p>
      </div>
    </div>
  )
}
