import { features } from "../../features";
import { getChatGPTUser, chatGPTSignInPath } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { bankDetails, participants } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { Shell, Heading } from "../../components/shell";
import { saveBank } from "../../vendor-actions";
export const dynamic = "force-dynamic";
export default async function Payments({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const flags = await features();
  const user = await getChatGPTUser(),
    q = await searchParams,
    db = getDb();
  const profile = user
    ? await db
        .select()
        .from(participants)
        .where(eq(participants.id, user.userId))
        .get()
    : null;
  const bank = user
    ? await db
        .select()
        .from(bankDetails)
        .where(eq(bankDetails.userId, user.userId))
        .get()
    : null;
  return (
    <Shell active="Payment details">
      <Heading
        eyebrow="CONTRIBUTOR PAYMENTS"
        title="Get ready to receive payment."
        description="Add your bank details when you are ready. You can register, apply and complete work first."
      />
      {!user ? (
        <a
          className="button dark"
          href={chatGPTSignInPath("/workspace/payments")}
        >
          Sign in
        </a>
      ) : !profile ? (
        <a href="/workspace">Complete your contributor profile first</a>
      ) : !flags.bank ? (
        <div className="soft-note">
          Bank onboarding is temporarily paused. Previously saved details remain
          protected.
        </div>
      ) : (
        <div className="onboarding-grid">
          <section className="suite-card">
            <h2>{bank ? "Update payment details" : "Add payment details"}</h2>
            {q.saved && (
              <div className="notice" role="status">
                Bank details saved.
              </div>
            )}
            {bank && (
              <p>
                Account ending <strong>{bank.last4}</strong> · Updated{" "}
                {bank.updated.slice(0, 10)} · Ownership unverified
              </p>
            )}
            <form action={saveBank}>
              <label>
                Account holder’s name
                <input
                  name="holder"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="off"
                />
              </label>
              <label>
                Account number
                <input
                  name="account"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{9,18}"
                  autoComplete="off"
                />
              </label>
              <label>
                Confirm account number
                <input
                  name="confirm"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{9,18}"
                  autoComplete="off"
                />
              </label>
              <label>
                IFSC
                <input
                  name="ifsc"
                  required
                  pattern="[A-Za-z]{4}0[A-Za-z0-9]{6}"
                  maxLength={11}
                  autoComplete="off"
                />
              </label>
              <label className="check">
                <input name="consent" type="checkbox" value="yes" required />
                These are my bank details. I authorize the Samuriq AI owner to
                use them to arrange my project payments.
              </label>
              <button>Save bank details</button>
            </form>
          </section>
          <aside className="suite-card">
            <h3>How payments work</h3>
            <p>
              Submit work and proof, then wait for the coordinator to record the
              client’s QC decision. Payment follows the project’s agreed terms.
            </p>
            <div className="soft-note">
              Details are encrypted before storage and masked here. The
              authorized owner can explicitly reveal them for payout
              administration.
            </div>
            <p>
              Saving details does not initiate a transfer or confirm payment
              eligibility. Do not enter a PIN, OTP, card number or banking
              password.
            </p>
            <a href="/privacy">Privacy information</a>
          </aside>
        </div>
      )}
    </Shell>
  );
}
