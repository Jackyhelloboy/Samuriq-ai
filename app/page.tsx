import { ProjectCard } from "./components/project-card";
import { ContentSlot } from "./components/content-slot";
import { Brand } from "./marks";
import { getDb } from "../db";
import { projects } from "../db/schema";
import { eq, desc, or, and } from "drizzle-orm";
import {
  ArrowUpRight,
  AudioLines,
  ScanEye,
  Layers3,
  Move3d,
} from "lucide-react";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const q = await searchParams,
    source = encodeURIComponent(
      (q.utm_source || q.source || "direct").slice(0, 100),
    ),
    board = "/projects?source=" + source,
    jobs = await getDb()
      .select()
      .from(projects)
      .where(and(eq(projects.archivedAt,""),or(eq(projects.active,1),eq(projects.visibility,"listed"))))
      .orderBy(desc(projects.active),desc(projects.created))
      .limit(12);
  const displayJobs=jobs.filter(j=>!j.sample), examples=jobs.filter(j=>j.sample);
  return (
    <div className="premium-site pro5">
      <a className="skip-to-content" href="#main-content">Skip to main content</a>
      <header className="company-nav">
        <Brand />
        <nav aria-label="Main navigation">
          <a href={board}>Opportunities</a>
          <a href="/demo/login">Try demo</a>
          <a href="#company">For businesses</a>
        </nav>
        <a className="nav-signin" href="/login">
          Sign in <ArrowUpRight size={17} />
        </a>
      </header>
      <main id="main-content" tabIndex={-1}>
        <section className="project-first-hero">
          <div>
            <p className="eyebrow">PROJECT OPPORTUNITIES</p>
            <h1>
              Work in your language.
              <br />
              <em>Join your team.</em>
            </h1>
            <p>
              Explore individual and paired projects, check the equipment you need, or join a team with your invitation code.
            </p>
            <div className="hero-workspace-actions"><a className="button pearl" href={board}>Find a project <ArrowUpRight size={16}/></a><a href="/join">Use an invitation <ArrowUpRight size={15}/></a></div>
          </div>
          <img
            src="/images/recording-studio.webp" width={1280} height={853} fetchPriority="high"
            alt="A contributor speaking into a microphone at a home workstation"
          />
        </section>
        <section className="home-project-board">
          <div className="section-kicker">
            <div>
              <h2>Project opportunities</h2>
            </div>
            <a className="text-link" href={board}>
              Search & filter projects ↗
            </a>
          </div>
          <ContentSlot slot="home" />
          <div className={"opportunity-grid"+(displayJobs.length===1?" single-opportunity":"")}>
            {displayJobs.map((j) => (
              <ProjectCard
                key={j.id}
                job={j}
                source={decodeURIComponent(source)}
              />
            ))}
          </div>
          {!!examples.length&&<details className="project-examples"><summary>Explore sample projects ({examples.length})</summary><div className="opportunity-grid">{examples.map(j=><ProjectCard key={j.id} job={j} source={decodeURIComponent(source)}/>)}</div></details>}
          {!displayJobs.length && (
            <p>New projects will appear when applications open.</p>
          )}
          {jobs.length === 12 && <a className="text-link" href={board}>View all projects and filters <ArrowUpRight size={16}/></a>}
        </section>{" "}

        <section className="expertise-section" id="expertise">
          <div className="editorial-heading">
            <p className="eyebrow">PROJECT CATEGORIES</p>
            <h2>
              Human understanding.
              <br />
              <em>Across every modality.</em>
            </h2>
            <p>
              From language and perception to everyday motion, we coordinate
              people around the data your project needs.
            </p>
          </div>
          <div className="expertise-list">
            {[
              [
                AudioLines,
                "Language & speech",
                "Scripted conversations, multilingual participation and paired recording workflows.",
              ],
              [
                ScanEye,
                "Data annotation",
                "Project-based labeling and review across text, image, audio and video.",
              ],
              [
                Move3d,
                "Human motion & POV",
                "Participant coordination for real-world activities and first-person data collection.",
              ],
              [
                Layers3,
                "Evaluation & feedback",
                "Human judgment to review outputs against project-specific requirements.",
              ],
            ].map(([Icon, t, d], i) => {
              const Glyph = Icon as typeof AudioLines;
              return (
                <article key={String(t)}>
                  
                  <Glyph size={28} strokeWidth={1.2} />
                  <div>
                    <h3>{String(t)}</h3>
                    <p>{String(d)}</p>
                  </div>
                  <a href={board} aria-label={"Explore " + t}>
                    <ArrowUpRight size={21} />
                  </a>
                </article>
              );
            })}
          </div>
        </section>
        <section className="delivery-section" id="delivery">
          <div className="delivery-photo">
            <img
              src="/images/collaboration.jpg"
              alt="Two professionals reviewing a project together"
              loading="lazy"
            />
            <span>HUMAN EXPERTISE, COORDINATED.</span>
          </div>
          <div className="delivery-copy">
            <p className="eyebrow">HOW PROJECTS WORK</p>
            <h2>
              From first connection
              <br />
              to <em>daily progress.</em>
            </h2>
            <ol>
              {[
                [
                  "Find your project",
                  "Choose work that matches your language, skills and equipment.",
                ],
                [
                  "Join an approved team",
                  "Complete your profile, confirm your partner where required and receive coordinator approval.",
                ],
                [
                  "Contribute. Report. Improve.",
                  "Work on the assigned platform, share daily output and follow quality-review feedback.",
                ],
              ].map(([t, d], i) => (
                <li key={t}>
                  <b>0{i + 1}</b>
                  <div>
                    <h3>{t}</h3>
                    <p>{d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <a className="text-link" href="/login">
              Enter your workspace <ArrowUpRight size={18} />
            </a>
          </div>
        </section>
        <section className="business-section" id="company">
          <p className="eyebrow">FOR AI TEAMS & PROJECT PARTNERS</p>
          <div>
            <h2>
              Join your team.
              <br />
              <em>Our human focus.</em>
            </h2>
            <aside>
              <p>
                Participant sourcing, structured onboarding and daily
                reporting—organized around your project brief.
              </p>
              <a
                className="button pearl"
                href="mailto:rayan.editor.businessquarry577@gmail.com?subject=Samuriq%20AI%20Project%20Enquiry"
              >
                Discuss your project <ArrowUpRight size={18} />
              </a>
            </aside>
          </div>
          <div className="business-principles">
            <span>Brief-led coordination</span>
            <span>Approved participation</span>
            <span>Evidence-based reporting</span>
            <span>Client-led quality review</span>
          </div>
        </section>
      </main>
      <ContentSlot slot="footer" />
      <footer className="company-footer">
        <div>
          <Brand />
          <p>Human data. Real possibility.</p>
        </div>
        <nav aria-label="Footer navigation"><a href="/india">India locations & languages</a>
          <a href="#expertise">Expertise</a>
          <a href={board}>Project opportunities</a>
          <a href="/login">Your workspace</a>
          <a href="/privacy">Privacy & data</a>
        </nav>
        <div className="footer-legal">
          <span>© {new Date().getFullYear()} Samuriq AI</span>
          <span>Human contribution for a more capable world.</span>
        </div>
      </footer>
    </div>
  );
}
