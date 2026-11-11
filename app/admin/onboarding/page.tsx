import { requireOperator } from "../../access";
import { getDb } from "../../../db";
import { onboarding, participants, projects } from "../../../db/schema";
import { eq, desc, like, or } from "drizzle-orm";
import { Shell, Heading, Empty } from "../../components/shell";
import { verifyTutorial } from "../../onboarding-actions";
export const dynamic = "force-dynamic";
export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const staff = await requireOperator();
  const q = await searchParams,
    term = (q.q || "").slice(0, 100),
    page = Math.max(1, Math.floor(Number(q.page) || 1)),
    rows = await getDb()
      .select()
      .from(onboarding)
      .innerJoin(participants, eq(participants.id, onboarding.userId))
      .innerJoin(projects, eq(projects.id, onboarding.projectId))
      .where(
        term
          ? or(
              like(participants.name, "%" + term + "%"),
              like(projects.title, "%" + term + "%"),
            )
          : undefined,
      )
      .orderBy(desc(onboarding.lastTick))
      .limit(30)
      .offset((page - 1) * 30);
  return (
    <Shell admin active="Onboarding">
      <Heading
        eyebrow="CONTRIBUTOR SUPPORT"
        title="A clear start for every person."
        description="Help contributors complete project tutorials. Verify external video completion only after checking it with the participant."
      />
      {staff.role === "owner" && (
        <a className="button light" href="/admin/registrations">
          Download private registration CSV ↓
        </a>
      )}
      <form className="filter-bar">
        <input
          name="q"
          placeholder="Search contributor or project"
          defaultValue={term}
        />
        <button>Search</button>
      </form>
      {rows.map((row) => {
        const r = row.onboarding,
          p = row.participants,
          j = row.projects;
        return (
          <section className="suite-card" key={r.userId + r.projectId}>
            <div className="section-kicker">
              <h2>
                {p.name} · {j.title}
              </h2>
              <span className="badge">
                {r.acceptedAt
                  ? "Terms accepted"
                  : r.verified
                    ? "Tutorial verified"
                    : "In progress"}
              </span>
            </div>
            <p>
              {r.watched} / {j.tutorialSeconds} seconds ·{" "}
              {r.clientUsername || "Client identity pending"}
            </p>
            {!r.verified && !r.acceptedAt && (
              <form action={verifyTutorial}>
                <input type="hidden" name="userId" value={p.id} />
                <input type="hidden" name="projectId" value={j.id} />
                <label>
                  How was completion verified?
                  <textarea
                    name="note"
                    required
                    minLength={10}
                    maxLength={1000}
                  />
                </label>
                <button>Verify tutorial completion</button>
              </form>
            )}
          </section>
        );
      })}
      {!rows.length && (
        <Empty title="No onboarding records">
          Records appear when contributors open a tutorial.
        </Empty>
      )}
      <div className="pagination">
        {page > 1 && (
          <a href={"?q=" + encodeURIComponent(term) + "&page=" + (page - 1)}>
            Previous
          </a>
        )}
        {rows.length === 30 && (
          <a href={"?q=" + encodeURIComponent(term) + "&page=" + (page + 1)}>
            Next
          </a>
        )}
      </div>
    </Shell>
  );
}
