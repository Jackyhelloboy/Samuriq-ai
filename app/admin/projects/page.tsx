import { projectState } from "../../project-state";
import { getTableColumns } from "drizzle-orm";
import { cardFields,realProject } from "../../project-listing";
import { requireOperatorView as requireOperator } from "../../access";
import { getDb } from "../../../db";
import { projects } from "../../../db/schema";
import { desc,like,count,and,ne } from "drizzle-orm";
import { toggleProject } from "../../project-actions";
import { Shell,Heading,Empty } from "../../components/shell";
import { Plus,Search } from "lucide-react";
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
  const filter = and(realProject,ne(projects.visibility,"removed"),term ? like(projects.title, "%" + term + "%") : undefined);
  const jobs = await db
    .select({...getTableColumns(projects), languages:cardFields.languages, devices:cardFields.devices})
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
        title="Hiring projects"
        description="Create detailed briefs, manage client destinations and control applications."
        action={operator.role==="owner"?
          <a className="button dark" href="/admin/projects/edit">
            <Plus size={16} />
            Create project
          </a>:<a className="button dark" href="/admin/projects/new">Create project draft</a>
        }
      />
      <form className="filter-bar">
        <input
          name="q"
          defaultValue={term}
          aria-label="Search projects by title" placeholder="Search your projects…"
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
        <div className="portfolio-grid">
          {jobs.map(j=><article className="portfolio-card" key={j.id}>
            <header><span className="card-discipline">{j.category}</span>
              <span className="badge">{j.archivedAt?"Closed":j.visibility==="paused"?"Paused":!j.active&&j.visibility==="draft"?"Draft":projectState(j)==="online"?"Open":projectState(j)==="soon"?"Upcoming":"Closed"}</span></header>
            <h3>{j.title}</h3><p>{j.description}</p>
            <dl className="hiring-facts">{[
              ["Work format",j.location+" · "+(j.pair?"Permanent pair":"Individual")],
              ["Languages",j.languages||"All languages"],["Devices",j.devices||"Any device"],
              ["Compensation",j.rate||"Unspecified"],["Project dates",(j.targetStart||"Unscheduled")+" – "+(j.deadline||"No deadline")]
            ].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
            <details><summary>Project requirements</summary><p>{j.requirements||"Add the requirements in the public post editor."}</p></details>
            <div className="portfolio-links">
              <a href={"/admin/projects/post?id="+encodeURIComponent(j.id)}>Edit listing & recruitment</a>
              <a href={"/admin/projects/workflow?id="+encodeURIComponent(j.id)}>Training & evidence</a>
              {operator.role==="owner" && <a href={"/admin/projects/edit?id="+encodeURIComponent(j.id)}>Full brief & access settings</a>}
            </div>
            <form action={toggleProject} className="portfolio-controls">
              <input name="id" type="hidden" value={j.id}/>
              {j.active ? <button name="mode" value="pause">Pause project</button> :
                !j.sample && <button name="mode" value="activate">{j.visibility==="paused"?"Resume project":"Activate project"}</button>}
              {!j.archivedAt && <button name="mode" value="close">Close project</button>}
            </form>
            {operator.role==="owner" && <details><summary>Delete project</summary>
              <form action={toggleProject} className="invite-form"><input type="hidden" name="id" value={j.id}/>
                <p>This removes the listing from the board and portfolio. Work and payment history is retained.</p>
                <label>Type the project title to confirm<input name="confirm" required autoComplete="off"/></label>
                <button name="mode" value="delete">Confirm deletion</button></form></details>}
          </article>)}
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
