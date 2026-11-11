import {features} from "../features";
import {previewProjects} from "../preview-projects";
import { ProjectCard } from "../components/project-card";
import { ContentSlot } from "../components/content-slot";
import { projectState, stateLabel } from "../project-state";
import { getDb } from "../../db";
import { projects } from "../../db/schema";
import { eq, desc, and, like, or, count } from "drizzle-orm";
import { Shell, Heading, Empty } from "../components/shell";
import { ArrowUpRight, Search, Users, MapPin } from "lucide-react";
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
    or(eq(projects.active,1),eq(projects.visibility,"listed")),
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
      .select()
      .from(projects)
      .where(filter)
      .orderBy(desc(projects.created))
      .limit(50)
      .offset((page - 1) * 50),
    total = (await db.select({ n: count() }).from(projects).where(filter))[0].n;
  const flags=await features(),samples=flags.preview_projects&&page===1?previewProjects.filter(j=>(!category||j.category===category)&&(!term||(j.title+" "+j.description).toLowerCase().includes(term.toLowerCase()))):[];
  const params = new URLSearchParams({
    q: term,
    category,
    source: q.source || "direct",
  });
  return (
    <Shell active="Find projects">
      <Heading
        eyebrow="OPPORTUNITY MARKETPLACE"
        title="Find work that fits you."
        description="Explore AI projects, read the requirements and apply with confidence."
      />
      <div className="market-banner premium-market">
        <div>
          <span className="badge">HUMAN INTELLIGENCE</span>
          <h2>Your skills can shape what’s next.</h2>
          <p>
            Project-based contributions across language, data, evaluation and
            real-world collection.
          </p>
        </div>
        <img src="/images/team.jpg" alt="Professionals working together" />
      </div>
      <form className="filter-bar" method="get">
        <label>
          <span className="sr-only">Search projects</span>
          <input
            name="q"
            defaultValue={term}
            placeholder="Search projects, skills or keywords…"
          />
        </label>
        <label>
          <span className="sr-only">Category</span>
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
        <input type="hidden" name="source" value={q.source || "direct"} />
        <button>
          <Search size={16} />
          Search
        </button>
      </form>
      <div className="section-kicker">
        <h3>
          {total} published {total === 1 ? "project" : "projects"}{samples.length>0&&" · "+samples.length+" layout previews"}
        </h3>
        <span>Newest first</span>
      </div>
      <ContentSlot slot="projects" />
      <div className="opportunity-grid">
        {[...jobs,...samples].map((j) => (
          <ProjectCard key={j.id} job={j} source={q.source || "direct"} />
        ))}
      </div>
      {!jobs.length && (
        <Empty title="No matching projects">
          Try a different search or category.
        </Empty>
      )}
      <div className="pagination">
        {page > 1 && (
          <a href={"/projects?" + params + "&page=" + (page - 1)}>
            Previous page
          </a>
        )}
        <span>Page {page}</span>
        {page * 50 < total && (
          <a href={"/projects?" + params + "&page=" + (page + 1)}>Next page</a>
        )}
      </div>
    </Shell>
  );
}
