import { requireOwner } from "../../access";
import { getDb } from "../../../db";
import { bankDetails, participants, bankAudit } from "../../../db/schema";
import { eq, desc } from "drizzle-orm";
import { Shell, Heading, Empty } from "../../components/shell";
export const dynamic = "force-dynamic";
export default async function Payments() {
  await requireOwner();
  const db = getDb();
  const rows = await db
    .select()
    .from(bankDetails)
    .innerJoin(participants, eq(bankDetails.userId, participants.id))
    .orderBy(desc(bankDetails.updated))
    .limit(100);
  const audit = await db
    .select()
    .from(bankAudit)
    .orderBy(desc(bankAudit.created))
    .limit(10);
  return (
    <Shell admin active="Payments">
      <Heading
        eyebrow="VENDOR PAYOUT PREPARATION"
        title="Payment details, in one place."
        description="Workers may add bank details after completing work. Review client QC and agreed terms before arranging payouts."
      />
      <a className="button dark" href="/admin/payouts">Open earnings & payout ledger →</a>
      <div className="soft-note">
        Details are unverified. Revealing them records an audit event. Transfers
        remain manual until a payout provider is connected.
      </div>
      <section className="suite-card">
        <h2>Saved beneficiary details</h2>
        <div className="table-scroll">
          <table className="suite-table">
            <thead>
              <tr>
                <th>Contributor</th>
                <th>Account</th>
                <th>Updated</th>
                <th>Owner action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ bank_details: b, participants: p }) => (
                <tr key={p.id}>
                  <td>
                    {p.name}
                    <small>{p.email}</small>
                  </td>
                  <td>
                    •••• {b.last4}
                    <small>Ownership unverified</small>
                  </td>
                  <td>{b.updated.slice(0, 10)}</td>
                  <td>
                    <form
                      action="/admin/payments/reveal"
                      method="post"
                      target="_blank"
                    >
                      <input name="userId" value={p.id} type="hidden" />
                      <button>Reveal for payout</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <Empty title="No bank details saved">
            Workers can use My workspace → Payment details when ready.
          </Empty>
        )}
      </section>
      <section className="suite-card">
        <h2>Recent access audit</h2>
        {audit.map((a) => (
          <p key={a.id}>
            {a.created} · {a.action} · {a.target}
          </p>
        ))}
      </section>
    </Shell>
  );
}
