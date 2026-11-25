import {cardFields,publishedProject} from "./project-listing";
import { ProjectCard } from "./components/project-card";
import { ContentSlot } from "./components/content-slot";
import { Brand } from "./marks";
import { getDb } from "../db";
import { projects } from "../db/schema";
import { desc } from "drizzle-orm";
import {
  ArrowUpRight,
  AudioLines,
  BellRing,
  ScanEye,
  Layers3,
  Move3d,
  Search,
  Users,
  Building2,
  ShieldCheck,
  Wallet,
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
      .select(cardFields)
      .from(projects)
      .where(publishedProject)
      .orderBy(desc(projects.active),desc(projects.created))
      .limit(12);
  return (
    <div className="premium-site pro5 hiring-site elevated-original">
      <a className="skip-to-content" href="#main-content">Skip to main content</a>
      <header className="company-nav">
        <Brand />
        <nav aria-label="Main navigation">
          <a href="#projects">Projects</a>
          <a href="#vendors">For vendors</a>
          <a href="/login#sign-in">Sign in</a>
        </nav>
        <a className="nav-signin" href="/login#create-account">
          Join Samuriq AI <ArrowUpRight size={17} />
        </a>
      </header>
      <main id="main-content" tabIndex={-1}>
        <section className="hiring-hero">
          <div>
            <p className="eyebrow">Project opportunities · Freelancers · Vendors</p>
            <h1>
              People power
              <br />
              <em>AI projects.</em>
            </h1>
            <p>
              Find work that fits your skills or bring your own team. Browse every published project freely, then register to participate and receive eligible payments.
            </p>
            <div className="hiring-actions"><a className="primary-hiring-link" href="#projects">Explore projects <ArrowUpRight size={16}/></a><a href="/login?return_to=%2Fworkspace%2Fhiring%3Finterest%3Dvendor#create-account">Become a vendor <ArrowUpRight size={15}/></a></div>
          </div>
          <img
            src="/images/team-1200.webp" srcSet="/images/team-640.webp 640w, /images/team-1200.webp 1200w" sizes="(max-width: 760px) 100vw, 50vw" width={1200} height={800} fetchPriority="high"
            alt="Professionals collaborating on a project"
          />
        </section>
        <section className="elevated-benefits" aria-label="How Samuriq AI works">
          <div><Search size={22} aria-hidden="true"/><span><strong>Open opportunities</strong><small>Browse without an account</small></span></div>
          <div><Users size={22} aria-hidden="true"/><span><strong>Flexible participation</strong><small>Individuals and vendor teams</small></span></div>
          <div><ShieldCheck size={22} aria-hidden="true"/><span><strong>Clear project terms</strong><small>Requirements before you join</small></span></div>
          <div><Wallet size={22} aria-hidden="true"/><span><strong>Account-based payments</strong><small>Register for eligible payouts</small></span></div>
        </section>
        <section className="home-project-board" id="projects">
          <div className="section-kicker">
            <div>
              <p className="eyebrow">THE PROJECT BOARD</p><h2>Current projects</h2><p className="board-intro">Discover published opportunities, requirements and rates.</p>
            </div>
            <a className="text-link" href={board}>
              Search all projects <ArrowUpRight size={16}/>
            </a>
          </div>
          <form className="elevated-search" action="/projects" method="get" aria-label="Search opportunities">
            <label><Search size={20} aria-hidden="true"/><input name="q" placeholder="Search by project or keyword" aria-label="Search by project or keyword"/></label>
            <label><span className="search-category-label">Category</span><select name="category" aria-label="Project category"><option value="">All categories</option>{["AI training","Data annotation","3D hand labeling","Video labeling","Speech & audio","Human motion & POV","AI evaluation","Research & other"].map(c=><option key={c}>{c}</option>)}</select></label>
            <input type="hidden" name="source" value={decodeURIComponent(source)}/>
            <button type="submit">Find projects <ArrowUpRight size={16}/></button>
          </form>
          <ContentSlot slot="home" />
          <div className="opportunity-grid">
            {jobs.map((j) => (
              <ProjectCard
                key={j.id}
                job={j}
                source={decodeURIComponent(source)}
              />
            ))}
            {jobs.length === 1 && (
              <aside className="next-project-card">
                <span className="next-project-icon"><BellRing size={28} strokeWidth={1.5} /></span>
                <div>
                  <h3>Hear about the next project</h3>
                  <p>Tell us your preferred languages, location and equipment to receive updates when suitable projects open.</p>
                </div>
                <a href="/login?return_to=%2Fworkspace%2Fhiring#create-account">Get project updates <ArrowUpRight size={18} /></a>
              </aside>
            )}
          </div>
          {!jobs.length && (
            <p>New projects will appear when applications open.</p>
          )}
        </section>{" "}

        <section className="hiring-paths" aria-label="Ways to participate">
          <article>
            <span className="elevated-path-icon"><Users size={26} aria-hidden="true"/></span>
            <p className="eyebrow">Join individually</p>
            <h2>Work on a project that fits you.</h2>
            <p>Read the brief and requirements, register your details, then follow your project’s onboarding steps. Keep payment details in your account for approved work.</p>
            <a href={board}>Explore projects <ArrowUpRight size={18}/></a>
          </article>
          <article>
            <span className="elevated-path-icon"><Building2 size={26} aria-hidden="true"/></span>
            <p className="eyebrow">Coordinate a team</p>
            <h2>Bring your people together.</h2>
            <p>Register vendor interest, share your team capacity and coordinate assigned contributors through project-specific invitations.</p>
            <a href="/login?return_to=%2Fworkspace%2Fhiring%3Finterest%3Dvendor#create-account">Register vendor interest <ArrowUpRight size={18}/></a>
          </article>
        </section>
        <section className="expertise-section" id="expertise">
          <div className="editorial-heading">
            <h2>Explore by <em>specialty.</em></h2>
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
                    <h3><a href={board+"&category="+encodeURIComponent(["Speech & audio","Data annotation","Human motion & POV","AI evaluation"][i])}>{String(t)} <ArrowUpRight size={16}/></a></h3>
                    <p>{String(d)}</p>
                  </div>

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

          </div>
          <div className="delivery-copy">

            <h2>
              How to join <em>a project.</em>
            </h2>
            <ol>
              {[
                [
                  "Find your project",
                  "Choose work that matches your language, skills and equipment.",
                ],
                [
                  "Register for the project",
                  "Create your account, complete your profile and register for the project you want to join.",
                ],
                [
                  "Join your project group",
                  "Complete the agreement and tutorial, then join your assigned group and access work when approved.",
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
        <section className="business-section" id="vendors">
          <p className="eyebrow">FOR VENDOR PARTNERS</p>
          <div>
            <h2>
              Bring a team <em>to the project.</em>
            </h2>
            <aside>
              <p>
                Share your available languages, locations, devices and team size. Approved vendor teams can invite members using a team code, with each member assigned to the right project.
              </p>
              <a
                className="button pearl"
                href="/login?return_to=%2Fworkspace%2Fhiring%3Finterest%3Dvendor#create-account"
              >
                Register as a vendor <ArrowUpRight size={18} />
              </a>
            </aside>
          </div>

        </section>
      </main>
      <ContentSlot slot="footer" />
      <footer className="company-footer">
        <div>
          <Brand />

        </div>
        <nav aria-label="Footer navigation"><a href="/india">India locations & languages</a>
          <a href="#vendors">For vendors</a>
          <a href={board}>Project opportunities</a>
          <a href="/login">Your workspace</a>
          <a href="/support">Get support</a>
          <a href="/join">Use a team invitation</a><a href="/privacy">Privacy &amp; data</a>
        </nav>
        <div className="footer-legal">
          <span>© {new Date().getFullYear()} Samuriq AI</span>

        </div>
      </footer>
    </div>
  );
}
