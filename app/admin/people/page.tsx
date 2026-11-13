import { requireOwnerView as requireOwner } from "../../access";
import { getDb } from "../../../db";
import { participants, managers, operationAudit } from "../../../db/schema";
import { like, or, desc } from "drizzle-orm";
import { Shell, Heading } from "../../components/shell";
import { setManager } from "../../role-actions";
export const dynamic = "force-dynamic";
export default async function People({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const owner = await requireOwner(),
    q = await searchParams,
    db = getDb(),
    term = (q.q || "").slice(0, 100),
    rows = await db
      .select()
      .from(participants)
      .where(
        term
          ? or(
              like(participants.name, "%" + term + "%"),
              like(participants.email, "%" + term + "%"),
            )
          : undefined,
      )
      .limit(50),
    staff = await db.select().from(managers),
    audit = await db
      .select()
      .from(operationAudit)
      .orderBy(desc(operationAudit.created))
      .limit(15);
  return (
    <Shell admin active="People & roles">
      <Heading
        eyebrow="OWNER ONLY"
        title="The right access. The right people."
        description="Appoint registered contributors as managers after verifying their identity. Your owner role cannot be delegated here."
      />
      <form className="filter-bar">
        <input
          name="q"
          defaultValue={term}
          placeholder="Search name or email"
        />
        <button>Find person</button>
      </form>
      <div className="table-scroll">
        <table className="suite-table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Role</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const isOwner =
                  p.email.toLowerCase() === owner.email.toLowerCase(),
                manager = staff.some((s) => s.userId === p.id);
              return (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    <small>{p.email}</small>
                  </td>
                  <td>
                    {isOwner ? "Owner" : manager ? "Manager" : "Contributor"}
                  </td>
                  <td>
                    {!isOwner && (
                      <form action={setManager}>
                        <input type="hidden" name="userId" value={p.id} />
                        <input
                          type="hidden"
                          name="grant"
                          value={manager ? "no" : "yes"}
                        />
                        <button>
                          {manager
                            ? "Remove manager access"
                            : "Appoint manager"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <section className="suite-card">
        <h2>Permission boundaries</h2>
        <p>
          Managers can review applications, help contributors with onboarding,
          view team output and mark evidence for correction or review.
          Owner-only tools include project configuration, roles, private
          registration exports, client QC approval, banking, integrations and
          platform controls.
        </p>
        <h3>Recent administrative activity</h3>
        {audit.map((a) => (
          <p key={a.id}>
            {a.created.slice(0, 16)} · {a.action} · {a.target}
          </p>
        ))}
      </section>
    </Shell>
  );
}
