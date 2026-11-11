import { requireOperator } from "../../access";
import { getDb } from "../../../db";
import { projects } from "../../../db/schema";
import { teamRows, indiaDay } from "../../team-metrics";
import { Shell, Heading, Stats, Empty } from "../../components/shell";
export const dynamic = "force-dynamic";
export default async function Team({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const operator = await requireOperator();
  const q = await searchParams,
    day = /^\d{4}-\d{2}-\d{2}$/.test(q.day || "") ? q.day : indiaDay(),
    page = Math.max(1, Math.floor(Number(q.page) || 1)),
    rows = await teamRows(q.project || "", day),
    jobs = await getDb().select().from(projects),
    params = new URLSearchParams({ day, project: q.project || "" });
  return (
    <Shell admin active="Team & targets">
      <Heading
        eyebrow="MANUAL CLIENT REPORTING"
        title="Your working team. One clear report."
        description="Track fixed pairs, completed sections and shared recording hours. Download a client-ready CSV without bank details or private proof links."
        action={
          <>
            {operator.role === "owner" && (
              <form
                action="/admin/remind"
                method="post"
                style={{ display: "inline-block", marginRight: 12 }}
              >
                <button className="button light">
                  Send Telegram reminders to everyone missing today
                </button>
              </form>
            )}
            {operator.role === "owner" && (
              <a className="button dark" href={"/admin/team/export?" + params}>
                Download client report
              </a>
            )}
          </>
        }
      />
      <Stats
        items={[
          ["Approved assignments", rows.length],
          ["Reported today", rows.filter((r) => r.today).length],
          ["Missing check-in", rows.filter((r) => !r.today).length],
          [
            "Sections today",
            rows.reduce((s, r) => s + (r.today?.units || 0), 0),
          ],
        ]}
      />
      <section className="suite-card">
        <form className="filter-bar">
          <input name="day" type="date" defaultValue={day} />
          <select name="project" defaultValue={q.project || ""}>
            <option value="">All projects</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
          <button>Show team</button>
        </form>
        <p>
          One pair lead reports shared output once. Reported hours track the
          target; only QC-approved minutes count toward estimated earnings. No
          report means follow-up needed, not proof of inactivity.
        </p>
        <div className="table-scroll">
          <table className="suite-table">
            <thead>
              <tr>
                <th>Team / project</th>
                <th>Daily output</th>
                <th>Target progress</th>
                <th>QC / estimated earnings</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .slice((page - 1) * 30, page * 30)
                .map(({ a, p, j, today, minutes, qc, remaining, amount }) => (
                  <tr key={a.userId + j.id}>
                    <td>
                      <strong>
                        {p.name}
                        {j.pair ? " + " + a.partner : ""}
                      </strong>
                      <small>{j.title}</small>
                      <small>
                        {a.communityHandle || "No community handle"}
                      </small>
                      <small>
                        {a.communityVerified
                          ? "Community verified"
                          : "Verification pending"}
                      </small>
                    </td>
                    <td>
                      <span className="badge">
                        {today?.status || "Follow up · no report"}
                      </span>
                      <small>
                        {today?.units || 0} sections · {today?.minutes || 0}{" "}
                        minutes
                      </small>
                      <small>
                        Client ID: {today?.clientId || "Not supplied"}
                      </small>
                    </td>
                    <td>
                      <strong>
                        {(minutes / 60).toFixed(1)} /{" "}
                        {(j.targetMinutes / 60).toFixed(1)} hours
                      </strong>
                      <small>
                        {j.targetStart} → {j.deadline}
                      </small>
                      <small>
                        {remaining
                          ? `${(remaining / 60).toFixed(1)} hours remaining`
                          : "Reported target reached"}
                      </small>
                      {j.deadline && day > j.deadline && remaining > 0 && (
                        <span className="badge">Deadline passed · review</span>
                      )}
                    </td>
                    <td>
                      {(qc / 60).toFixed(2)} approved hours
                      <small>
                        ₹{amount.toFixed(2)} {j.pair ? "per pair" : "total"}
                      </small>
                      {!!j.pair && (
                        <small>
                          ₹{(amount / 2).toFixed(2)} each · not paid
                        </small>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <Empty title="No approved assignments">
            Approve completed pair applications from Overview.
          </Empty>
        )}
        <div className="pagination">
          {page > 1 && (
            <a href={"?" + params + "&page=" + (page - 1)}>Previous</a>
          )}
          <span>Page {page}</span>
          {page * 30 < rows.length && (
            <a href={"?" + params + "&page=" + (page + 1)}>Next</a>
          )}
        </div>
      </section>
    </Shell>
  );
}
