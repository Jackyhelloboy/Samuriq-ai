import { Brand } from "./marks";
import { getDb } from "../db";
import { projects } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import {
  ArrowUpRight,
  AudioLines,
  ScanEye,
  Layers3,
  Move3d,
  ArrowRight,
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
      .where(eq(projects.active, 1))
      .orderBy(desc(projects.created))
      .limit(6);
  return (
    <div className="premium-site">
      <header className="company-nav">
        <Brand />
        <nav aria-label="Main navigation">
          <a href="#expertise">Expertise</a>
          <a href={board}>Opportunities</a>
          <a href="#delivery">Our approach</a>
          <a href="#company">For businesses</a>
        </nav>
        <a className="nav-signin" href="/login">
          Sign in <ArrowUpRight size={17} />
        </a>
      </header>
      <main>
        <section className="company-hero">
          <div className="hero-copy">
            <p className="eyebrow">THE HUMAN SIDE OF ARTIFICIAL INTELLIGENCE</p>
            <h1>
              Intelligence begins
              <br />
              with <em>people.</em>
            </h1>
            <p className="hero-lead">
              Connecting human expertise with the teams building tomorrow’s AI.
            </p>
            <div className="actions">
              <a className="button pearl" href={board}>
                Explore opportunities <ArrowUpRight size={18} />
              </a>
              <a className="hero-link" href="#company">
                Build with us <ArrowRight size={18} />
              </a>
            </div>
            <div className="hero-footnote">
              <span>DATA COLLECTION</span>
              <span>ANNOTATION</span>
              <span>AI EVALUATION</span>
            </div>
          </div>
          <div className="hero-image">
            <img
              src="/images/team.jpg"
              alt="A collaborative team discussing work around a laptop"
              fetchPriority="high"
            />
            <div className="image-caption">
              <span>PEOPLE × POSSIBILITY</span>
              <p>
                A human perspective.
                <br />A more capable future.
              </p>
            </div>
            <span className="image-index">01 / HUMAN INTELLIGENCE</span>
          </div>
        </section>
        <section className="statement-strip">
          <span>BUILT FOR THE WORK THAT MATTERS</span>
          <p>
            Different skills. Shared standards.
            <br />
            <strong>One place to move projects forward.</strong>
          </p>
          <a href="#delivery" aria-label="Explore our approach">
            <ArrowUpRight size={30} />
          </a>
        </section>
        <section className="expertise-section" id="expertise">
          <div className="editorial-heading">
            <p className="eyebrow">01 — OUR EXPERTISE</p>
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
                  <span className="expertise-number">0{i + 1}</span>
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
        <section className="careers-section">
          <div className="section-title-line">
            <div>
              <p className="eyebrow">02 — CONTRIBUTE YOUR EXPERTISE</p>
              <h2>
                Good work starts
                <br />
                with the right opportunity.
              </h2>
            </div>
            <a className="button outline" href={board}>
              Browse all projects <ArrowUpRight size={17} />
            </a>
          </div>
          <div className="premium-openings">
            {jobs.map((j, i) => (
              <a
                key={j.id}
                href={
                  "/projects/detail?id=" +
                  encodeURIComponent(j.id) +
                  "&source=" +
                  source
                }
              >
                <span className="opening-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <span>{j.category}</span>
                  <h3>{j.title}</h3>
                </div>
                <p>
                  {j.location}
                  <small>
                    {j.pair ? "Permanent pair" : "Individual contribution"}
                  </small>
                </p>
                <span className="opening-status">
                  <i /> Applications open
                </span>
                <ArrowUpRight size={24} />
              </a>
            ))}
            {!jobs.length && (
              <p>New opportunities will appear here when applications open.</p>
            )}
          </div>
          <p className="editorial-note">
            Every opportunity includes its own requirements, approval process
            and compensation terms.
          </p>
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
            <p className="eyebrow">03 — A CLEAR WAY TO WORK</p>
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
              Your next project.
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
      <footer className="company-footer">
        <div>
          <Brand />
          <p>Human data. Real possibility.</p>
        </div>
        <nav aria-label="Footer navigation">
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
