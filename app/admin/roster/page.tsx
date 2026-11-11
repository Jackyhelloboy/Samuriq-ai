import { requireOperator } from "../../access";
import { getDb } from "../../../db";
import {
  applications,
  participants,
  projects,
  progress,
} from "../../../db/schema";
import { Shell, Heading } from "../../components/shell";
import { indiaDay } from "../../team-metrics";
import { projectState, stateLabel, missedInfo } from "../../project-state";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";
export default async function Roster({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const operator = await requireOperator();
  const q = await searchParams,
    db = getDb(),
    day = indiaDay();
  const jobs = await db.select().from(projects);
  const job = jobs.find((j) => j.id === q.project) || jobs[0];
  const rows = job
    ? await db
        .select()
        .from(applications)
        .innerJoin(participants, eq(participants.id, applications.userId))
        .where(eq(applications.projectId, job.id))
    : [];
  const reps = job
    ? await db.select().from(progress).where(eq(progress.projectId, job.id))
    : [];
  const list = rows.map(({ applications: a, participants: p }) => {
    const mine = reps.filter((r) => r.userId === a.userId);
    return {
      a,
      p,
      days: mine.length,
      mins: mine.reduce((s, r) => s + r.minutes, 0),
      today: mine.some((r) => r.day === day),
      blocked: job
        ? missedInfo(
            mine
              .map((r) => r.day)
              .sort()
              .pop(),
            a.created,
            job,
          ).blocked
        : false,
    };
  });
  const working = list.filter((x) => x.a.status === "approved");
  return (
    <Shell admin active="Project roster">
      <Heading
        eyebrow="PER-PROJECT USERS"
        title="Who is on this project."
        description="Everyone who registered for the selected project, and who has submitted a daily report today."
      />
      <form method="get" style={{ marginBottom: 20 }}>
        <label>
          Project
          <select name="project" defaultValue={job?.id}>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        </label>
        <button className="button light" style={{ marginTop: 10 }}>
          Show
        </button>
      </form>
      {job && (
        <p>
          <span
            className={
              "badge" + (projectState(job) === "online" ? " approved" : "")
            }
          >
            {stateLabel(projectState(job))}
          </span>{" "}
          {working.length} approved assignments · {list.length - working.length}{" "}
          registered or pending · {working.filter((x) => !x.today).length} not
          reported today
        </p>
      )}
      <div className="table-scroll">
        <table className="suite-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Telegram</th>
              <th>Status</th>
              <th>Verified</th>
              <th>Today</th>
              <th>Access</th>
              <th>Days reported</th>
              <th>Minutes</th>
            </tr>
          </thead>
          <tbody>
            {list.map((x) => (
              <tr key={x.a.userId}>
                <td>{x.p.name}</td>
                <td>{x.p.telegram}</td>
                <td>{x.a.status}</td>
                <td>{x.a.communityVerified ? "Yes" : "No"}</td>
                <td>
                  {x.a.status !== "approved"
                    ? "-"
                    : x.today
                      ? "Reported"
                      : "MISSING"}
                </td>
                <td>
                  {x.a.status !== "approved"
                    ? "-"
                    : x.blocked
                      ? "PAUSED (missed updates)"
                      : "Portal enabled"}
                </td>
                <td>{x.days}</td>
                <td>{x.mins}</td>
              </tr>
            ))}
            {!list.length && (
              <tr>
                <td colSpan={8}>No registrations for this project yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
