import { ParticipationCards } from "../components/participation-cards";
import {devices} from "../recruitment/data";
import {INDIA_LANGUAGES} from "../india-languages";
import {sql} from "drizzle-orm";
import {cardFields,publishedProject} from "../project-listing";

import { ProjectCard } from "../components/project-card";
import { ContentSlot } from "../components/content-slot";

import { getDb } from "../../db";
import { projects } from "../../db/schema";
import { eq, desc, and, like, or, count } from "drizzle-orm";
import { Shell, Empty } from "../components/shell";
import { Search } from "lucide-react";
export const dynamic = "force-dynamic";
export default async function Projects({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const q = await searchParams,
    term = (q.q || "").slice(0, 100),
    category = q.category || "",
    page = Math.max(1, Math.min(10000, Number(q.page) || 1));
  const filter = and(
    publishedProject,
    q.language ? sql`NOT EXISTS(SELECT 1 FROM project_recruitment r WHERE r.project_id=${projects.id} AND r.languages<>'' AND instr(', '||r.languages||', ', ', '||${q.language}||', ')=0)` : undefined,
    q.device ? sql`NOT EXISTS(SELECT 1 FROM project_recruitment r WHERE r.project_id=${projects.id} AND r.devices<>'' AND instr(', '||r.devices||', ', ', '||${q.device}||', ')=0)` : undefined,
    term
      ? or(
          like(projects.title, "%" + term + "%"),
          like(projects.description, "%" + term + "%"),
        )
      : undefined,
    category ? eq(projects.category, category) : undefined,
  );
  const db = getDb(),
    jobs = await db
      .select(cardFields)
      .from(projects)
      .where(filter)
      .orderBy(desc(projects.active),desc(projects.created))
      .limit(50)
      .offset((page - 1) * 50),
    total = (await db.select({ n: count() }).from(projects).where(filter))[0].n;
  const params = new URLSearchParams({
    language:q.language||"",device:q.device||"",q: term,
    category,
    source: q.source || "direct",
  });
  return (
    <Shell active="Find projects">
      <h1 className="sr-only">Projects</h1>
      <form className="filter-bar project-filters" method="get">
        <label>
          <span className="filter-label">Search projects</span>
          <input
            name="q"
            defaultValue={term}
            placeholder="Search by title or keyword"
          />
        </label>
        <label>
          <span className="filter-label">Category</span>
          <select name="category" defaultValue={category}>
            <option value="">All categories</option>
            {[
              "AI training",
              "Data annotation",
              "3D hand labeling",
              "Video labeling",
              "Speech & audio",
              "Human motion & POV",
              "AI evaluation",
              "Research & other",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        {([["language",INDIA_LANGUAGES],["device",devices]] as const).map(([key,options])=><label key={key}><span className="filter-label">{key==="device"?"Equipment":"Language"}</span><select name={key} defaultValue={q[key]||""}><option value="">{key==="device"?"All devices":"All languages"}</option>{options.map(o=><option key={o}>{o}</option>)}</select></label>)}
        <input type="hidden" name="source" value={q.source || "direct"} />
        <button>
          <Search size={16} />
          Apply filters
        </button>
        {(term||category||q.language||q.device)&&<a className="filter-reset" href={"/projects?source="+encodeURIComponent(q.source||"direct")}>Clear filters</a>}
      </form>
      <ParticipationCards />
      <div className="section-kicker">
        <h3>
          {total} published {total === 1 ? "project" : "projects"}
        </h3>
        <span>Active projects first</span>
      </div>
      <ContentSlot slot="projects" />
      <div className="opportunity-grid">
        {jobs.map((j) => (
          <ProjectCard key={j.id} job={j} source={q.source || "direct"} />
        ))}
      </div>
      {!jobs.length && (
        <Empty title="No matching projects">
          Try a different search or category.
        </Empty>
      )}
      {total > 50 && <div className="pagination">
        {page > 1 && (
          <a href={"/projects?" + params + "&page=" + (page - 1)}>
            Previous page
          </a>
        )}
        <span>Page {page}</span>
        {page * 50 < total && (
          <a href={"/projects?" + params + "&page=" + (page + 1)}>Next page</a>
        )}
      </div>}
    </Shell>
  );
}
