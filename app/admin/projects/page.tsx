import { requireOperator } from "../../access";
import { getDb } from "../../../db";
import { projects } from "../../../db/schema";
import { desc, like, count } from "drizzle-orm";
import { toggleProject } from "../../project-actions";
import { Shell, Heading, Empty } from "../../components/shell";
import { Plus, Search, ArrowUpRight } from "lucide-react";
export const dynamic = "force-dynamic";
export default async function AdminProjects({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const operator=await requireOperator();
  const q = await searchParams,
    term = (q.q || "").slice(0, 100),
    page = Math.max(1, Math.min(10000, Number(q.page) || 1)),
    db = getDb();
  const filter = term ? like(projects.title, "%" + term + "%") : undefined;
  const jobs = await db
    .select()
    .from(projects)
    .where(filter)
    .orderBy(desc(projects.created))
    .limit(20)
    .offset((page - 1) * 20);
  const total = (
    await db.select({ n: count() }).from(projects).where(filter)
  )[0].n;
  return (
    <Shell admin active="Projects">
      {operator.role==="owner"&&<div className="actions">
        <a className="button light" href="/admin/import">
          Import projects from CSV ↓
        </a>
      </div>}
      <Heading
        eyebrow="PROJECT OPERATIONS"
        title="Your project portfolio."
        description="Create detailed briefs, manage client destinations and control applications."
        action={operator.role==="owner"?
          <a className="button dark" href="/admin/projects/edit">
            <Plus size={16} />
            Create project
          </a>:undefined
        }
      />
      <form className="filter-bar">
        <input
          name="q"
          defaultValue={term}
          placeholder="Search your projects…"
        />
        <button>
          <Search size={16} />
          Search
        </button>
      </form>
      <section className="suite-card">
        <div className="section-kicker">
          <h2>{total} projects</h2>
          <span>20 per page</span>
        </div>
        <div className="table-scroll">
          <table className="suite-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Type / location</th>
                <th>Status</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td>
                    <strong>{j.title}</strong>
                    <small>{j.rate}</small>
                  </td>
                  <td>
                    {j.category}
                    <small>
                      {j.location} · {j.pair ? "Pair" : "Individual"}
                    </small>
                  </td>
                  <td>
                    <span className={"badge " + (j.active ? "approved" : "")}>
                      {j.active ? "ACTIVE" : j.visibility==="listed"?"CLOSED":"DRAFT"}
                    </span>
                  </td>
                  <td>
                    {operator.role==="owner"&&<a
                      className="text-link"
                      href={"/admin/projects/edit?id=" + j.id}
                    >
                      Edit brief
                    </a>}
                    <form action={toggleProject}>
                      <input name="id" type="hidden" value={j.id} />
                      <input
                        name="active"
                        type="hidden"
                        value={j.active ? "0" : "1"}
                      />
                      <button className="table-button">
                        {j.active ? "Close project" : "Activate project"}
                      </button>
                    </form>
                    <a href={"/projects/detail?id=" + j.id}>
                      View <ArrowUpRight size={12} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!jobs.length && (
          <Empty title="Start your project portfolio">
            Create a project and add its client brief.
          </Empty>
        )}
      </section>
      <div className="pagination">
        {page > 1 && (
          <a
            href={
              "/admin/projects?q=" +
              encodeURIComponent(term) +
              "&page=" +
              (page - 1)
            }
          >
            Previous
          </a>
        )}
        <span>Page {page}</span>
        {page * 20 < total && (
          <a
            href={
              "/admin/projects?q=" +
              encodeURIComponent(term) +
              "&page=" +
              (page + 1)
            }
          >
            Next
          </a>
        )}
      </div>
    </Shell>
  );
}
