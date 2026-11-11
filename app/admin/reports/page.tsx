import { requireOperator } from "../../access";
import { getDb } from "../../../db";
import {
  progress,
  projects,
  participants,
  applications,
} from "../../../db/schema";
import { and, eq, count, desc } from "drizzle-orm";
import { Shell, Heading, Stats, Empty } from "../../components/shell";
import { reviewReport } from "../../vendor-actions";
export const dynamic = "force-dynamic";
export default async function Reports({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const operator=await requireOperator();
  const q = await searchParams,
    db = getDb(),
    day = /^\d{4}-\d{2}-\d{2}$/.test(q.day || "")
      ? q.day
      : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
          new Date(),
        ),
    page = Math.max(1, Math.floor(Number(q.page) || 1));
  const filter = and(
    eq(progress.day, day),
    q.project ? eq(progress.projectId, q.project) : undefined,
  );
  const rows = await db
    .select()
    .from(progress)
    .innerJoin(participants, eq(participants.id, progress.userId))
    .innerJoin(projects, eq(projects.id, progress.projectId))
    .where(filter)
    .orderBy(desc(progress.updated))
    .limit(30)
    .offset((page - 1) * 30);
  const total = (
    await db.select({ n: count() }).from(progress).where(filter)
  )[0].n;
  const members = (
    await db
      .select({ n: count() })
      .from(applications)
      .where(
        and(
          eq(applications.status, "approved"),
          q.project ? eq(applications.projectId, q.project) : undefined,
        ),
      )
  )[0].n;
  const jobs = await db.select().from(projects),
    params = new URLSearchParams({ day, project: q.project || "" });
  return (
    <Shell admin active="Proof & reports">
      <Heading
        eyebrow="DAILY OPERATIONS"
        title="From reported to verified."
        description="Review evidence, reconcile client IDs and record QC decisions. All dates use India time."
        action={
          <a className="button dark" href={"/admin/export?" + params}>
            Download daily CSV
          </a>
        }
      />
      <Stats
        items={[
          ["Approved assignments", members],
          ["Reports on selected date", total],
        ]}
      />
      <section className="suite-card">
        <form className="filter-bar">
          <input type="date" name="day" defaultValue={day} />
          <select name="project" defaultValue={q.project || ""}>
            <option value="">All projects</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
          <button>Show reports</button>
        </form>
        <div className="soft-note">
          Proof reviewed is a coordinator check. Select client-approved only
          after receiving client QC confirmation, and add its reference. Missing
          reports do not prove inactivity. Daily CSV includes approved members
          with no report.
        </div>
        {rows.map(({ project_progress: r, participants: p, projects: j }) => (
          <article className="assignment" key={p.id + j.id}>
            <div className="section-kicker">
              <h3>
                {p.name} · {j.title}
              </h3>
              <span className="badge">{r.review}</span>
            </div>
            <p>
              {r.status} · {r.minutes} minutes · {r.units} sections · Client ID:{" "}
              {r.clientId || "Not provided"}
            </p>
            <p>{r.notes}</p>
            {r.proofUrl ? (
              <a href={r.proofUrl} target="_blank" rel="noreferrer">
                Open Drive evidence ↗
              </a>
            ) : (
              <p>No evidence link submitted</p>
            )}
            <form action={reviewReport}>
              <input type="hidden" name="userId" value={p.id} />
              <input type="hidden" name="projectId" value={j.id} />
              <input type="hidden" name="day" value={r.day} />
              <input type="hidden" name="version" value={r.updated} />
              <label>
                Review status
                <select name="review" defaultValue={r.review}>
                  <option value="pending">Pending</option>
                  <option value="proof-reviewed">Proof reviewed</option>
                  {operator.role==="owner"&&<option value="client-approved">Client-approved</option>}
                  <option value="needs-correction">Needs correction</option>
                </select>
              </label>
              <label>
                QC-approved recording minutes
                <input
                  name="approvedMinutes"
                  type="number"
                  min={0}
                  max={r.minutes}
                  defaultValue={r.approvedMinutes}
                  required
                />
                <small>
                  Only minutes confirmed by the client; cannot exceed this
                  report’s minutes.
                </small>
              </label>
              <label>
                Review note / client QC reference
                <textarea
                  name="reviewNote"
                  maxLength={1000}
                  defaultValue={r.reviewNote}
                />
              </label>
              <button>Save review</button>
            </form>
          </article>
        ))}
        {!rows.length && (
          <Empty title="No reports for this selection">
            Check the date or export the daily membership report.
          </Empty>
        )}
        <div className="pagination">
          {page > 1 && (
            <a href={"?" + params + "&page=" + (page - 1)}>Previous</a>
          )}
          <span>
            Page {page} · {total} reports
          </span>
          {page * 30 < total && (
            <a href={"?" + params + "&page=" + (page + 1)}>Next</a>
          )}
        </div>
      </section>
    </Shell>
  );
}
