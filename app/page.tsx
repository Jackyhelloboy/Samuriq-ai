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
    <div className="premium-site pro5 hiring-site">
      <a className="skip-to-content" href="#main-content">Skip to main content</a>
      <header className="company-nav">
        <Brand />
        <nav aria-label="Main navigation">
          <a href="#projects">Projects</a>
          <a href="#company">For businesses</a>
          <a href="/login#sign-in">Sign in</a>
        </nav>
        <a className="nav-signin" href="/login#create-account">
          Join Samuriq AI <ArrowUpRight size={17} />
        </a>
      </header>
      <main id="main-content" tabIndex={-1}>
        <section className="hiring-hero">
          <div>
            <p className="eyebrow">For freelance contributors and vendors</p>
            <h1>
              Find your next
              <br />
              <em>AI project.</em>
            </h1>
            <p>
              Discover projects that fit your language, skills and equipment. Join individually or register your team as a vendor.
            </p>
            <div className="hiring-actions"><a className="primary-hiring-link" href="#projects">See projects <ArrowUpRight size={16}/></a><a href="/login?return_to=%2Fworkspace%2Fhiring%3Finterest%3Dvendor#create-account">Register a team <ArrowUpRight size={15}/></a></div>
          </div>
          <img
            src="/images/team-1200.webp" srcSet="/images/team-640.webp 640w, /images/team-1200.webp 1200w" sizes="(max-width: 760px) 100vw, 50vw" width={1200} height={800} fetchPriority="high"
            alt="Professionals collaborating on a project"
          />
        </section>
        <section className="home-project-board" id="projects">
          <div className="section-kicker">
            <div>
              <h2>Current projects</h2>
            </div>
            <a className="text-link" href={board}>
              Search all projects <ArrowUpRight size={16}/>
            </a>
          </div>
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
                  <p>Share your language, location and equipment so we can contact you when a suitable opportunity opens.</p>
                </div>
                <a href="/login?return_to=%2Fworkspace%2Fhiring#create-account">Get project updates <ArrowUpRight size={18} /></a>
              </aside>
            )}
          </div>
          {!jobs.length && (
            <p>New projects will appear when applications open.</p>
          )}
        </section>{" "}

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
                  "Create your account, complete your profile and choose the project you want to join.",
                ],
                [
                  "Join your project group",
                  "Follow the project brief, join its group when invited and complete the required onboarding.",
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
              Build your <em>project team.</em>
            </h2>
            <aside>
              <p>
                Tell us the languages, devices and team size you need. We coordinate recruitment, onboarding and daily reporting.
              </p>
              <a
                className="button pearl"
                href="mailto:rayan.editor.businessquarry577@gmail.com?subject=Samuriq%20AI%20Project%20Enquiry"
              >
                Discuss your project <ArrowUpRight size={18} />
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
          <a href="#expertise">Expertise</a>
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
