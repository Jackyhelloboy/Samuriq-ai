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
    <div className="premium-site pro5 hiring-site vendor-v11">
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
            <p className="eyebrow">HUMAN DATA · PROJECT DELIVERY</p>
            <h1>
              Build the future of AI.
              <br /><em>Work together.</em>
            </h1>
            <p>
              Discover real project opportunities, join as an individual contributor or bring your own delivery team. Explore freely; register when you are ready to participate and receive eligible payments.
            </p>
            <div className="hiring-actions"><a className="primary-hiring-link" href="#projects">Explore projects <ArrowUpRight size={16}/></a><a href="/login?return_to=%2Fworkspace%2Fhiring%3Finterest%3Dvendor#create-account">Become a vendor <ArrowUpRight size={15}/></a></div>
          </div>
          <aside className="brand-portal" aria-label="Explore the Samuriq AI platform">
            <div className="portal-top"><span> SAMURIQ / PROJECT NETWORK</span><span className="portal-indicator">PROJECT DIRECTORY</span></div>
            <h2>One network.<br/>More possibilities.</h2>
            <div className="portal-records">
              {jobs.slice(0,3).map(j=><a key={j.id} href={"/projects/detail?id="+encodeURIComponent(j.id)+"&source="+source}><span className="portal-glyph"><Layers3 size={20}/></span><span><strong>{j.title}</strong><small>{j.category}</small></span><ArrowUpRight size={18}/></a>)}
              {!jobs.length&&<p>Explore the project directory for new opportunities as they become available.</p>}
            </div>
            <a className="portal-link" href={board}>Explore the project directory <ArrowUpRight size={17}/></a>
          </aside>
        </section>
        <section className="home-project-board" id="projects">
          <div className="section-kicker">
            <div>
              <p className="eyebrow">PROJECT MARKETPLACE</p><h2>Find your next opportunity.</h2><p className="v11-section-description">Explore published requirements, rates and joining instructions without signing in.</p>
            </div>
            <a className="text-link" href={board}>
              View all projects <ArrowUpRight size={16}/>
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
                  <h3>Stay ready for the next project</h3>
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
            <p className="eyebrow">Join individually</p>
            <h2>Work on a project that fits you.</h2>
            <p>Read the brief and requirements, register your details, then follow your project’s onboarding steps. Keep payment details in your account for approved work.</p>
            <a href={board}>Explore projects <ArrowUpRight size={18}/></a>
          </article>
          <article>
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
          <div className="delivery-photo brand-process"><span className="portal-indicator">THE SAMURIQ EXPERIENCE</span><h3>Clarity at every step.</h3>{[["01","Explore","Public project briefs"],["02","Connect","Project-specific onboarding"],["03","Deliver","Approved work and agreed payments"]].map(([n,t,d])=><div className="process-item" key={n}><span>{n}</span><div><strong>{t}</strong><small>{d}</small></div></div>)}</div>
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
                  "Create your account",
                  "Create your account, complete your profile and register for the project you want to join.",
                ],
                [
                  "Join your project group",
                  "Follow the project-specific instructions and terms. Approved work and verified payment details are required before payment.",
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
          <p className="eyebrow">FOR DELIVERY PARTNERS</p>
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
