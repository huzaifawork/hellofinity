import { useNavigate } from 'react-router-dom'

export default function TermsScreen() {
  const navigate = useNavigate()
  function back() { navigate(-1) }

  return (
    <div className="privacy-screen">
      <div className="privacy-header">
        <button className="back-btn" onClick={back}>← Back</button>
        <div className="privacy-header-title">Terms of Service</div>
      </div>
      <div className="privacy-body">
        <h2>Terms of Service</h2>
        <p className="privacy-updated">Last updated: January 2025</p>

        <p>By using HelloFinity you agree to these terms. They're short and written in plain English.</p>

        <h3>What HelloFinity is</h3>
        <p>HelloFinity is a savings challenge tracker. It helps you stay motivated with popular savings challenges like the 100 Envelope Challenge, 52 Week Challenge, and 365 Day Challenge. We're a tool to help you track progress — we're not a bank, financial adviser, or financial service.</p>

        <h3>Your account</h3>
        <p>You need an email address to create an account. You're responsible for keeping your account secure and for all activity that happens under it. You must be at least 13 years old to use HelloFinity.</p>

        <h3>Your data</h3>
        <p>You own your data. We store it to provide the service. See our <strong>Privacy Policy</strong> for details on how we handle it.</p>

        <h3>Acceptable use</h3>
        <p>You agree not to misuse HelloFinity — for example, by trying to access other users' data, scraping the service, or using it for anything illegal. We reserve the right to suspend accounts that violate these terms.</p>

        <h3>Service availability</h3>
        <p>We aim to keep HelloFinity available, but we can't guarantee 100% uptime. We're not liable for any losses caused by downtime or data loss, though we take reasonable steps to prevent both.</p>

        <h3>Changes to these terms</h3>
        <p>We may update these terms from time to time. We'll let you know about significant changes. Continued use of HelloFinity after changes means you accept the new terms.</p>

        <h3>Cancellation</h3>
        <p>You can delete your account at any time from the settings menu. If you have a paid subscription, you can cancel it from the same place.</p>

        <h3>Contact</h3>
        <p>Questions? Email us at <a href="mailto:hello@hellofinity.com">hello@hellofinity.com</a>.</p>
      </div>
    </div>
  )
}
