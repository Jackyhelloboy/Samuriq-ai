import { requireOperatorView as requireOperator } from "../access";
import { getDb } from "../../db";
import {
  participants,
  projects,
  applications,
  progress,
  launches,
} from "../../db/schema";
import { eq, desc, and, count, like, or, sql, inArray } from "drizzle-orm";
import { decideApplication } from "../project-actions";
import { Shell, Heading, Stats, Empty } from "../components/shell";
export const dynamic = "force-dynamic";
export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const operator=await requireOperator();
  const db = getDb(),
    q = await searchParams,
    term = (q.q || "").slice(0, 100),
    page = Math.max(1, Math.min(10000, Number(q.page) || 1));
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
  const filter = and(
    term
      ? or(
          like(participants.name, "%" + term + "%"),
          like(projects.title, "%" + term + "%"),
        )
      : undefined,
    ["approved", "pending", "declined"].includes(q.status)
      ? eq(applications.status, q.status)
      : undefined,
  );
  const rows = await db
    .select()
    .from(applications)
    .innerJoin(participants, eq(applications.userId, participants.id))
    .innerJoin(projects, eq(applications.projectId, projects.id))
    .leftJoin(
      progress,
      and(
        eq(progress.userId, applications.userId),
        eq(progress.projectId, applications.projectId),
        eq(progress.day, day),
      ),
    )
    .where(filter)
    .orderBy(desc(applications.created))
    .limit(30)
    .offset((page - 1) * 30);
  const opened = rows.length
    ? await db
        .select({
          userId: launches.userId,
          projectId: launches.projectId,
          last: sql<string>`max(${launches.created})`,
        })
        .from(launches)
        .where(
          inArray(
            launches.userId,
            rows.map((r) => r.participants.id),
          ),
        )
        .groupBy(launches.userId, launches.projectId)
    : [];
  const total = (
    await db
      .select({ n: count() })
      .from(applications)
      .innerJoin(participants, eq(applications.userId, participants.id))
      .innerJoin(projects, eq(applications.projectId, projects.id))
      .where(filter)
  )[0].n;
  const registered = (await db.select({ n: count() }).from(participants))[0].n,
    live = (
      await db
        .select({ n: count() })
        .from(projects)
        .where(eq(projects.active, 1))
    )[0].n,
    pending = (
      await db
        .select({ n: count() })
        .from(applications)
        .where(eq(applications.status, "pending"))
    )[0].n,
    today = (
      await db
        .select({ n: count() })
        .from(progress)
        .where(eq(progress.day, day))
    )[0].n;
  return (
    <Shell admin active="Applications">
      <Heading
        eyebrow="OPERATIONS OVERVIEW"
        title="Keep every project moving."
        description={
          "Applications, contributor activity and daily reporting · " +
          day +
          " IST"
        }
        action={
          <a className="button dark" href={operator.role==="owner"?"/admin/projects/edit":"/admin/onboarding"}>
            {operator.role==="owner"?"Create project":"Help with onboarding"}
          </a>
        }
      />
      <Stats
        items={[
          ["Contributors", registered],
          ["Open projects", live],
          ["Pending applications", pending],
          ["Reports today", today],
        ]}
      />
      <section className="suite-card">
        <h2>Your 5-minute daily routine</h2>
        <ol style={{ display: "grid", gap: 10, paddingLeft: 22, fontSize: 16 }}>
          <li><a href="/admin/team">Team & targets</a>: see who has not reported today and send reminders.</li>
          <li>Below: approve pending applications ({pending} waiting) after checking their Telegram message.</li>
          <li><a href="/admin/reports">Proof & reports</a>: review evidence and enter client-approved minutes.</li>
          <li><a href="/admin/team">Download the client report</a> and send it to the client.</li>
          <li><a href="/admin/payments">Payments</a>: prepare payouts from approved minutes only.</li>
        </ol>
      </section>
      <section className="suite-card">
        <div className="section-kicker">
          <h2>Applications & progress</h2>
          <a className="button light" href={operator.role==="owner"?"/admin/export":"/admin/roster"}>
            Export reports
          </a>
        </div>
        <form className="filter-bar">
          <input
            name="q"
            placeholder="Search contributor or project…"
            defaultValue={term}
          />
          <select name="status" defaultValue={q.status || ""}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="declined">Declined</option>
          </select>
          <button>Filter</button>
        </form>
        <div className="table-scroll">
          <table className="suite-table">
            <thead>
              <tr>
                <th>Contributor</th>
                <th>Project</th>
                <th>Today’s progress</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(
                ({
                  participants: p,
                  projects: j,
                  applications: a,
                  project_progress: r,
                }) => (
                  <tr key={a.userId + a.projectId}>
                    <td>
                      <strong>{p.name}</strong>
                      <small>{p.email}</small>
                      <small>{p.telegram || "No Telegram username"}</small>
                      <small>
                        {p.language} · {p.location}
                      </small>
                    </td>
                    <td>
                      <strong>{j.title}</strong>
                      <small>
                        {a.partner && "Permanent partner · " + a.partner}
                      </small>
                      <small>{a.partnerEmail}</small>
                      <small>
                        Partner consent:{" "}
                        {a.partnerConfirmed ? "Confirmed" : "Pending"}
                      </small>
                      <small>
                        Community: {a.communityHandle || "Not supplied"}
                      </small>
                      <details>
                        <summary>Application details</summary>
                        <p>{a.experience}</p>
                        <p>{p.skills}</p>
                        <small>Source · {p.source}</small>
                      </details>
                    </td>
                    <td>
                      <span className="badge">{r?.status || "No report"}</span>
                      <small>
                        Portal launch:{" "}
                        {opened.find(
                          (o) => o.userId === p.id && o.projectId === j.id,
                        )?.last || "Not recorded"}
                      </small>
                      {r && (
                        <>
                          <small>
                            {r.minutes} minutes · {r.units} units
                          </small>
                          <p>{r.notes}</p>
                        </>
                      )}
                    </td>
                    <td>
                      <form action={decideApplication}>
                        <input name="userId" type="hidden" value={p.id} />
                        <input name="projectId" type="hidden" value={j.id} />
                        <select name="status" defaultValue={a.status}>
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="declined">Declined</option>
                        </select>
                        <label className="check">
                          <input
                            type="checkbox"
                            name="communityVerified"
                            value="yes"
                            defaultChecked={!!a.communityVerified}
                          />
                          I verified the pair’s Telegram / Discord identities
                        </label>
                        <button>Save decision</button>
                      </form>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <Empty title="No matching applications">
            New applications appear here after contributors apply to a project.
          </Empty>
        )}
        <div className="pagination">
          {page > 1 && (
            <a
              href={
                "?q=" +
                encodeURIComponent(term) +
                "&status=" +
                (q.status || "") +
                "&page=" +
                (page - 1)
              }
            >
              Previous
            </a>
          )}
          <span>
            {total} applications · Page {page}
          </span>
          {page * 30 < total && (
            <a
              href={
                "?q=" +
                encodeURIComponent(term) +
                "&status=" +
                (q.status || "") +
                "&page=" +
                (page + 1)
              }
            >
              Next
            </a>
          )}
        </div>
      </section>
      <div className="soft-note">
        Daily progress is reported by contributors. “No report” means no
        check-in was submitted today. Client QC results are entered manually
        after receiving the client’s decision.
      </div>
    </Shell>
  );
}

