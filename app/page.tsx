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
  Building2,
  Users,
  ShieldCheck,
  Compass,
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
              Human talent.
              <br />Intelligent <em>impact.</em>
            </h1>
            <p>
              A project network built for people who deliver. Discover opportunities, bring your team and manage your work in one place.
            </p>
            <div className="hiring-actions"><a className="primary-hiring-link" href="#projects">Explore projects <ArrowUpRight size={16}/></a><a href="/login?return_to=%2Fworkspace%2Fhiring%3Finterest%3Dvendor#create-account">Become a vendor <ArrowUpRight size={15}/></a></div>
          </div>
          <aside className="brand-portal" aria-label="Explore the Samuriq AI platform">
            <div className="portal-top"><span> SAMURIQ / PROJECT NETWORK</span><span className="portal-indicator">PROJECT DIRECTORY</span></div>
            <div className="signature-network" aria-hidden="true"><svg viewBox="0 0 420 180" fill="none"><defs><linearGradient id="network-line" x1="0" y1="0" x2="420" y2="180" gradientUnits="userSpaceOnUse"><stop stopColor="#738fff"/><stop offset="1" stopColor="#e8d6b7"/></linearGradient></defs><g stroke="url(#network-line)" opacity=".6"><ellipse cx="210" cy="90" rx="164" ry="60" transform="rotate(-12 210 90)"/><ellipse cx="210" cy="90" rx="164" ry="60" transform="rotate(12 210 90)"/><ellipse cx="210" cy="90" rx="100" ry="76"/><path d="M46 90h328M210 14v152M80 38l260 104M80 142L340 38"/></g><g fill="#e8d6b7"><circle cx="46" cy="90" r="4"/><circle cx="374" cy="90" r="4"/><circle cx="210" cy="14" r="4"/><circle cx="210" cy="166" r="4"/><circle cx="80" cy="38" r="3"/><circle cx="340" cy="142" r="3"/></g><rect x="176" y="56" width="68" height="68" rx="19" fill="#152744" stroke="#e8d6b7"/><path d="M229 73h-25l-12 12 26 13-12 12h-14M194 110h24l12-12-26-13 12-12h14" stroke="#e8d6b7" strokeWidth="3.5" strokeLinejoin="round"/></svg></div><h2>Opportunity, connected.</h2>
            <div className="portal-records">
              {jobs.slice(0,3).map(j=><a key={j.id} href={"/projects/detail?id="+encodeURIComponent(j.id)+"&source="+source}><span className="portal-glyph"><Layers3 size={20}/></span><span><strong>{j.title}</strong><small>{j.category}</small></span><ArrowUpRight size={18}/></a>)}
              {!jobs.length&&<p>Explore the project directory for new opportunities as they become available.</p>}
            </div>
            <a className="portal-link" href={board}>Explore the project directory <ArrowUpRight size={17}/></a>
          </aside>
        </section>
        <section className="brand-assurances" aria-label="Platform benefits">
          {[[Compass,"Open discovery","Browse projects without signing in"],[Users,"Two ways to join","Contributors and vendor teams"],[ShieldCheck,"Project-specific terms","Know the requirements before work"],[Wallet,"Account-based payments","Registration required for eligible payouts"]].map(([Icon,t,d])=>{const Glyph=Icon as typeof Compass;return <article key={String(t)}><Glyph size={22} strokeWidth={1.6}/><div><strong>{String(t)}</strong><small>{String(d)}</small></div></article>})}
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
            <span className="path-icon"><Users size={27} strokeWidth={1.5}/></span>
            <p className="eyebrow">01 / FOR CONTRIBUTORS</p>
            <h2>Work on a project that fits you.</h2>
            <p>Read the brief and requirements, register your details, then follow your project’s onboarding steps. Keep payment details in your account for approved work.</p>
            <a href={board}>Explore projects <ArrowUpRight size={18}/></a>
          </article>
          <article>
            <span className="path-icon"><Building2 size={27} strokeWidth={1.5}/></span>
            <p className="eyebrow">02 / FOR VENDORS</p>
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
                  
                  <span className="specialty-glyph"><Glyph size={32} strokeWidth={1.5}/></span>
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
