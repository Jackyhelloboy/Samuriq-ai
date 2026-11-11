import { Brand } from "../marks";
export default function Privacy() {
  return (
    <>
      <header className="company-nav">
        <Brand />
        <a href="/">Home</a>
      </header>
      <main className="privacy-document">
        <h1>Participant privacy</h1>
        <div className="privacy-copy">
          <p>
            Samuriq AI uses your name, signed-in email, Telegram username,
            languages, location, equipment, skills, applications, partner name
            where required, referral source, client account IDs, evidence links,
            workspace launch times, and daily work reports to coordinate
            participation and project access.
          </p>
          <p>
            Your profile and reports are visible to you and the authorized
            Samuriq AI owner. Telegram links open a separate service. Client
            work happens on the client’s platform, which has its own policies.
          </p>
          <p>
            Daily work status is self-reported. Telegram verification is
            performed manually. Avoid adding passwords, government IDs, bank
            details or private client material to your progress notes.
          </p>
          <p>
            Optional payment details (account holder, account number and IFSC)
            are encrypted before storage. Only the authorized owner can
            explicitly reveal them for payment administration; updates and
            reveals are logged. Bank ownership is not automatically verified.
            Never put bank details in reports or public spreadsheets.
          </p>
          <p>
            For access, correction or deletion requests, contact Samuriq AI at{" "}
            <a href="mailto:rayan.editor.businessquarry577@gmail.com">
              rayan.editor.businessquarry577@gmail.com
            </a>
            .
          </p>
        </div>
      </main>
    </>
  );
}
