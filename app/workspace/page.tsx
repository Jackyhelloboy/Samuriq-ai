import {TeamDelegations} from "../components/team-delegations";
import {PairTeamInvitation} from "../components/pair-team-invitation";
import {baseRate,money} from "../team-access";
import {MyTeams} from "../components/my-teams";
import { ContentSlot } from "../components/content-slot";
import { ProjectCard } from "../components/project-card";
import {
  projectState,
  stateLabel,
  missedInfo,
  MISS_LIMIT,
} from "../project-state";
import { features } from "../features";
import { getChatGPTUser, chatGPTSignInPath } from "../chatgpt-auth";
import { Shell, Heading, Stats, Empty } from "../components/shell";
import { getDb } from "../../db";
import {
  participants,
  teamMembers,
  applications,
  projects,
  progress,
  reports,
  notices,
  integrations,
} from "../../db/schema";
import { eq, desc, or, and } from "drizzle-orm";
import { register } from "../actions";
import { setPartner, confirmPartner } from "../team-actions";
import { launchProject } from "../vendor-actions";
import { saveProgress } from "../suite-actions";
import { settings } from "../telegram";
import {
  ArrowUpRight,
  CheckCircle2,
  UserRound,
  Wallet,
  Radio,
} from "lucide-react";
export const dynamic = "force-dynamic";
export default async function Workspace({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const flags = await features();
  const query = await searchParams,
    user = await getChatGPTUser(),
    db = getDb();
  const profile = user
    ? await db
        .select()
        .from(participants)
        .where(eq(participants.id, user.userId))
        .get()
    : null;
  const memberships=user?await db.select().from(teamMembers).where(eq(teamMembers.userId,user.userId)):[];
  const mine = user
    ? await db
        .select()
        .from(applications)
        .innerJoin(projects, eq(applications.projectId, projects.id))
        .where(
          or(
            eq(applications.userId, user.userId),
            eq(applications.partnerEmail, user.email.toLowerCase()),
          ),
        )
    : [];
  const history = user
    ? await db
        .select()
        .from(progress)
        .innerJoin(projects, eq(progress.projectId, projects.id))
        .where(
          or(
            eq(progress.userId, user.userId),
            ...mine
              .filter((m) => m.applications.partnerConfirmed)
              .map((m) =>
                and(
                  eq(progress.userId, m.applications.userId),
                  eq(progress.projectId, m.projects.id),
                ),
              ),
          ),
        )
        .orderBy(desc(progress.day))
        .limit(30)
    : [];
  const targetReports = user
    ? await db
        .select()
        .from(progress)
        .where(
          or(
            eq(progress.userId, user.userId),
            ...mine
              .filter((m) => m.applications.partnerConfirmed)
              .map((m) =>
                and(
                  eq(progress.userId, m.applications.userId),
                  eq(progress.projectId, m.projects.id),
                ),
              ),
          ),
        )
    : [];
  const legacy = user
    ? await db
        .select()
        .from(reports)
        .where(eq(reports.userId, user.userId))
        .orderBy(desc(reports.day))
        .limit(7)
    : [];
  const news = !flags.announcements
    ? []
    : await db.select().from(notices).orderBy(desc(notices.created)).limit(5);
  const openProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.active, 1))
    .limit(6);
  const social = (await db.select().from(integrations)).filter((s) =>
    ["telegram", "discord", "instagram"].includes(s.id),
  );
  const approved = mine.filter(
      (m) =>
        m.applications.status === "approved" &&
        m.applications.communityVerified &&
        (!m.projects.pair || m.applications.partnerConfirmed) &&
        m.applications.userId === user?.userId,
    ),
    source = (query.source || "direct").slice(0, 100);
  return (
    <Shell active={query.edit ? "My profile" : "Overview"}>
      <MyTeams/><PairTeamInvitation/><TeamDelegations/>
      <Heading
        eyebrow="YOUR CONTRIBUTOR WORKSPACE"
        title={
          profile
            ? "Welcome back, " + profile.name.split(" ")[0] + "."
            : "Your next chapter starts here."
        }
        description="Discover opportunities, manage applications and keep every project moving."
        action={
          <a className="button dark" href="/projects">
            Explore projects <ArrowUpRight size={16} />
          </a>
        }
      />
      <ContentSlot slot="workspace" />{user&&<section className="suite-card evidence-entry"><div><span className="eyebrow">PAIR WORK / DAILY EVIDENCE</span><h2>Your uploads. Your TL’s verified record.</h2><p>Keep screenshots in your own Drive folder. Check attendance, section counts and team feedback here.</p></div><a className="button dark" href="/workspace/evidence">Evidence & attendance →</a></section>}
      {!user ? (
        <div className="onboarding-grid">
          <section className="suite-card">
            <div className="icon-tile">
              <UserRound />
            </div>
            <h2>
              One account.
              <br />
              More possibilities.
            </h2>
            <p>
              Sign in to build your contributor profile, apply to projects and
              save your daily progress.
            </p>
            <a
              className="button dark"
              target="_top"
              href={chatGPTSignInPath(
                "/workspace?source=" + encodeURIComponent(source),
              )}
            >
              Continue with ChatGPT
            </a>
          </section>
          <div className="onboarding-visual">
            <img
              src="/images/collaboration.jpg"
              alt="Professionals collaborating"
            />
            <div>
              <span>HUMAN INTELLIGENCE AT WORK</span>
              <h2>
                Your skills.
                <br />
                Real contribution.
              </h2>
            </div>
          </div>
        </div>
      ) : !profile || query.edit ? (
        <div className="onboarding-grid">
          <section className="suite-card">
            <div className="section-kicker">
              <span className="badge">CONTRIBUTOR PROFILE</span>
              <span>About 2 minutes</span>
            </div>
            <h2>{profile ? "Refine your profile." : "Let’s find your fit."}</h2>
            <p>
              Your profile helps coordinators understand your skills. Apply
              separately to any available project.
            </p>
            <form action={register} className="profile-form">
              <input name="source" type="hidden" value={source} />
              <input name="next" type="hidden" value={query.next || ""} />
              <div className="form-grid">
                <label>
                  Full name
                  <input
                    name="name"
                    required
                    maxLength={100}
                    defaultValue={profile?.name || user.displayName}
                  />
                </label>
                <label>
                  Languages you speak
                  <input
                    name="language"
                    required
                    maxLength={80}
                    placeholder="English, Hindi, Telugu…"
                    defaultValue={profile?.language}
                  />
                </label>
                <label>
                  City / country
                  <input
                    name="location"
                    maxLength={100}
                    placeholder="Hyderabad, India"
                    defaultValue={profile?.location}
                  />
                </label>
                <label>
                  Your equipment
                  <select
                    name="device"
                    defaultValue={profile?.device || "Android phone"}
                  >
                    <option>Android phone</option>
                    <option>iPhone</option>
                    <option>Laptop / desktop</option>
                    <option>Phone and computer</option>
                  </select>
                </label>
                <label>
                  Telegram username <small>Optional</small>
                  <input
                    name="telegram"
                    pattern="@?[A-Za-z0-9_]{5,32}"
                    placeholder="@username"
                    defaultValue={profile?.telegram}
                  />
                </label>
                <label>
                  Primary interest
                  <select
                    name="project"
                    defaultValue={profile?.project || "general"}
                  >
                    <option value="general">Explore all AI projects</option>
                    <option value="annotation">Data annotation</option>
                    <option value="evaluation">AI evaluation</option>
                    <option value="motion">Human motion & POV</option>
                    <option value="speech">Speech & audio</option>
                  </select>
                </label>
              </div>
              <div className="form-grid"><label>Project contact number<input name="phone" type="tel" maxLength={18} defaultValue={profile?.phone} placeholder="+91…"/></label><label className="check"><input name="phoneConsent" type="checkbox" value="yes" defaultChecked={!!profile?.phoneConsent}/>I allow my assigned team leader and authorized managers to contact me for project coordination. Staff phone numbers are not publicly shared.</label></div>
              <label>
                Skills & experience
                <textarea
                  name="skills"
                  maxLength={1500}
                  rows={3}
                  placeholder="Tell us what you’re comfortable doing…"
                  defaultValue={profile?.skills}
                />
              </label>
              <label className="check">
                <input type="checkbox" name="consent" value="yes" required />I
                agree to the use of my profile and project reports for
                participation coordination.
              </label>
              <div className="form-footer">
                <a href="/privacy">Privacy information</a>
                <button>
                  Save my profile <ArrowUpRight size={16} />
                </button>
              </div>
            </form>
          </section>
          <aside className="onboarding-aside">
            <img
              src="/images/collaboration.jpg"
              alt="Collaborative project work"
            />
            <h3>Built around your potential.</h3>
            {[
              "Apply to multiple projects",
              "Review requirements before joining",
              "Access approved client workspaces",
              "Track your own daily contribution",
            ].map((t) => (
              <p key={t}>
                <CheckCircle2 size={17} />
                {t}
              </p>
            ))}
            <div className="soft-note">
              A profile helps you apply. Each project has its own eligibility
              and approval process.
            </div>
          </aside>
        </div>
      ) : (
        <>
          <Stats
            items={[
              ["Applications", mine.length],
              ["Approved projects", approved.length],
              ["Recent reports", history.length],
              [
                "Minutes · last 30 reports",
                history.reduce((s, r) => s + r.project_progress.minutes, 0),
              ],
            ]}
          />
          <section className="suite-card">
            <div className="section-kicker">
              <h2>Open opportunities</h2>
              <a href="/projects">View all projects</a>
            </div>
            {openProjects.map((j) => (
              <a
                className="social-row"
                key={j.id}
                href={"/projects/detail?id=" + encodeURIComponent(j.id)}
              >
                <span>
                  <strong>{j.title}</strong>
                  <small>
                    {" "}
                    · {j.category} · {j.location}
                  </small>
                </span>
                <ArrowUpRight size={16} />
              </a>
            ))}
          </section>
          <div className="soft-note">
            Opening a client workspace records a launch only. Work and QC are
            verified separately. The external site has its own login; its
            address becomes visible after opening.
          </div>
          <div className="workspace-columns">
            <div>
              <section className="suite-card">
                <div className="section-kicker">
                  <h2>My projects</h2>
                  <a href="/projects">
                    Find more <ArrowUpRight size={14} />
                  </a>
                </div>
                {mine.length ? (
                  mine.map(({ projects: j, applications: a }) => (
                    <article className="assignment" key={j.id}>
                      <div className="assignment-top">
                        <span className="category-symbol">
                          {j.category.slice(0, 2).toUpperCase()}
                        </span>
                        <span className={"badge " + a.status}>{a.status}</span>
                      </div>
                      <h3>{j.title}</h3>
                      <p>
                        {j.category} · {j.location}
                      </p>
                      {j.onboardingRequired === 1 && (
                        <a
                          className="button light"
                          href={
                            "/projects/onboarding?id=" +
                            encodeURIComponent(j.id)
                          }
                        >
                          Complete project onboarding →
                        </a>
                      )}
                      {!!j.pair && (
                        <div className="soft-note">
                          <strong>
                            Permanent partner: {a.partner || "Not set"}
                          </strong>
                          <p>
                            {a.partnerConfirmed
                              ? "Pair confirmed and locked. One shared daily report, submitted by the pair lead."
                              : "Partner confirmation required before work access."}
                          </p>
                          {a.userId === user.userId && !a.partnerConfirmed && (
                            <form action={setPartner}>
                              <input
                                name="projectId"
                                type="hidden"
                                value={j.id}
                              />
                              <label>
                                Partner’s name
                                <input
                                  name="partner"
                                  defaultValue={a.partner}
                                  required
                                />
                              </label>
                              <label>
                                Partner’s sign-in email
                                <input
                                  name="partnerEmail"
                                  type="email"
                                  defaultValue={a.partnerEmail}
                                  required
                                />
                              </label>
                              <label>
                                Telegram / Discord username
                                <input
                                  name="communityHandle"
                                  defaultValue={a.communityHandle}
                                  required
                                />
                              </label>
                              <button>Save partner invitation</button>
                              <p>
                                Your partner should sign in here using that
                                email, complete their profile and confirm the
                                pair.
                              </p>
                            </form>
                          )}
                          {a.partnerEmail === user.email.toLowerCase() &&
                            !a.partnerConfirmed && (
                              <form action={confirmPartner}>
                                <input
                                  name="projectId"
                                  type="hidden"
                                  value={j.id}
                                />
                                <input
                                  name="leadId"
                                  type="hidden"
                                  value={a.userId}
                                />
                                <label className="check">
                                  <input
                                    name="consent"
                                    type="checkbox"
                                    value="yes"
                                    required
                                  />
                                  I agree to this permanent pair, shared
                                  recording target and project terms.
                                </label>
                                <button>Confirm my permanent pair</button>
                              </form>
                            )}
                        </div>
                      )}
                      <p>
                        <span
                          className={
                            "badge" +
                            (projectState(j) === "online" ? " approved" : "")
                          }
                        >
                          {stateLabel(projectState(j))}
                        </span>
                        {j.tutorialUrl && (
                          <>
                            {" "}
                            ·{" "}
                            <a
                              href={
                                "/projects/detail?id=" +
                                encodeURIComponent(j.id)
                              }
                            >
                              Watch the tutorial video
                            </a>
                          </>
                        )}
                      </p>
                      {a.status === "approved" && !j.evidenceRequired &&
                        (() => {
                          const last = history.find(
                              (h) => h.project_progress.projectId === j.id,
                            )?.project_progress.day,
                            m = missedInfo(last, a.created, j);
                          return m.blocked ? (
                            <div className="soft-note pace">
                              <div className="need bad">
                                <strong>Access paused.</strong> You missed{" "}
                                {m.missed} daily updates (limit {MISS_LIMIT}).
                                Submit today’s update under “Report progress” to
                                restore access.
                              </div>
                            </div>
                          ) : null;
                        })()}
                      {j.targetMinutes > 0 &&
                        (() => {
                          const period = targetReports.filter(
                              (r) =>
                                r.userId === a.userId &&
                                r.projectId === j.id &&
                                r.day >= j.targetStart &&
                                r.day <= j.deadline,
                            ),
                            mins = period.reduce((s, r) => s + r.minutes, 0),
                            qc = period.reduce(
                              (s, r) =>
                                s +
                                (r.review === "client-approved"
                                  ? r.approvedMinutes
                                  : 0),
                              0,
                            );
                          return (
                            <div className="soft-note pace">
                              {(() => {
                                const D = (s: string) =>
                                  new Date(s + "T00:00:00Z").getTime();
                                const today = new Intl.DateTimeFormat("en-CA", {
                                  timeZone: "Asia/Kolkata",
                                }).format(new Date());
                                const total = Math.max(
                                  1,
                                  Math.round(
                                    (D(j.deadline) - D(j.targetStart)) / 864e5,
                                  ) + 1,
                                );
                                const passed = Math.min(
                                  total,
                                  Math.max(
                                    0,
                                    Math.round(
                                      (D(today) - D(j.targetStart)) / 864e5,
                                    ) + 1,
                                  ),
                                );
                                const left = Math.max(
                                  1,
                                  Math.round(
                                    (D(j.deadline) - D(today)) / 864e5,
                                  ) + 1,
                                );
                                const pct = Math.min(
                                  100,
                                  (mins / j.targetMinutes) * 100,
                                );
                                const need = Math.max(
                                  0,
                                  j.targetMinutes - mins,
                                );
                                const perDay = Math.ceil(need / left);
                                const doneToday = period.some(
                                  (r) => r.day === today,
                                );
                                const behind = pct < (passed / total) * 100 - 5;
                                return (
                                  <>
                                    <span className="big">
                                      {(mins / 60).toFixed(1)} /{" "}
                                      {j.targetMinutes / 60} h reported (
                                      {Math.round(pct)}%)
                                    </span>
                                    <div
                                      className="bar"
                                      role="progressbar"
                                      aria-valuemin={0}
                                      aria-valuemax={100}
                                      aria-valuenow={Math.round(pct)}
                                      aria-label="Target progress"
                                    >
                                      <div
                                        className="fill"
                                        style={{ width: pct + "%" }}
                                      />
                                      <div
                                        className="time"
                                        style={{
                                          left: (passed / total) * 100 + "%",
                                        }}
                                        title="Where today falls between start and deadline"
                                      />
                                    </div>
                                    <div className="row">
                                      <span>
                                        Green = your work · Orange line = today
                                      </span>
                                      <span>
                                        {left} day{left === 1 ? "" : "s"} left ·
                                        due {j.deadline}
                                      </span>
                                    </div>
                                    <div
                                      className={
                                        "need " +
                                        (need === 0
                                          ? "ok"
                                          : behind
                                            ? "bad"
                                            : "")
                                      }
                                    >
                                      {need === 0
                                        ? "Target reached. Keep reporting until the deadline."
                                        : "To finish on time record about " +
                                          (perDay / 60).toFixed(1) +
                                          " h per day." +
                                          (behind
                                            ? " You are behind pace."
                                            : "")}
                                    </div>
                                    {!doneToday && (
                                      <div className="need bad">
                                        <strong>
                                          Today’s update is missing.
                                        </strong>{" "}
                                        Daily updates are mandatory. Unreported
                                        days are not eligible for payout.
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                              <p>
                                QC approved: {(qc / 60).toFixed(2)} hours · Your estimated work pay {money(Math.round(qc*(memberships.find(m=>m.projectId===j.id)?.ratePaise??baseRate(j))/60))}.
                                {' '}<a href="/workspace/earnings">See posted earnings and payments</a>. Estimates are subject to owner posting and your accepted project terms.
                              </p>
                            </div>
                          );
                        })()}
                      {projectState(j)==="online" && a.status === "approved" &&
                      a.communityVerified &&
                      (!j.pair || a.partnerConfirmed) ? (
                        <>
                          <div className="soft-note">
                            {j.inviteCode && (
                              <>
                                Required invite code{" "}
                                <strong>{j.inviteCode}</strong>
                                <br />
                              </>
                            )}
                            Review the project brief before starting.
                          </div>
                          <a
                            className="button dark"
                            href={
                              "/projects/work?id=" + encodeURIComponent(j.id)
                            }
                          >
                            Open project desk →
                          </a>
                          {projectState(j)==="online" && flags.community &&
                            !j.onboardingRequired &&
                            j.communityUrl && (
                              <a
                                className="button light"
                                href={j.communityUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Join approved project community ↗
                              </a>
                            )}
                          <div className="actions">
                            {flags.client_access &&
                              !j.onboardingRequired &&
                              j.clientUrl && (
                                <form action={launchProject}>
                                  <input
                                    type="hidden"
                                    name="projectId"
                                    value={j.id}
                                  />
                                  <button>
                                    Open client workspace{" "}
                                    <ArrowUpRight size={15} />
                                  </button>
                                </form>
                              )}
                            <a className="button light" href="#progress">
                              Report progress
                            </a>
                          </div>
                        </>
                      ) : (
                        <p>
                          {a.status === "pending"
                            ? "Your application is awaiting coordinator review."
                            : a.status === "declined"
                              ? "This application has been declined."
                              : "Complete pair confirmation and ask your coordinator to verify community identities before starting."}
                        </p>
                      )}
                    </article>
                  ))
                ) : (
                  <Empty title="Your next project is waiting.">
                    Browse available opportunities and send your first
                    application.
                  </Empty>
                )}
              </section>
              <div className="howto">
                <strong>How this works</strong>
                <ol>
                  <li>Complete your profile, then apply to a project.</li>
                  <li>
                    Message us on Telegram so we can verify you. Registration
                    alone gives no access.
                  </li>
                  <li>
                    After approval, open the client workspace with the button
                    below. Never share the link.
                  </li>
                  <li>
                    Every day, send your update under “Report progress”. Missed
                    days are not paid.
                  </li>
                  <li>
                    Watch the bar: green is your work, the orange line is today.
                  </li>
                </ol>
              </div>
              <section className="suite-card" id="progress">
                <div className="section-kicker">
                  <h2>Daily check-in</h2>
                  <span className="badge">INDIA TIME</span>
                </div>
                <p>
                  The pair lead submits one report for both partners. Enter
                  today’s completed sections and shared recording minutes, not
                  two people’s combined time. A second update replaces today’s
                  report.
                </p>
                {query.saved && (
                  <div className="notice" role="status">
                    Your progress has been saved.
                  </div>
                )}
                {flags.reporting && approved.length ? (
                  <form action={saveProgress}>
                    <label>
                      Project
                      <select name="projectId">
                        {approved.filter(m=>!m.projects.evidenceRequired).map(({ projects: j }) => (
                          <option key={j.id} value={j.id}>
                            {j.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="form-grid">
                      <label>
                        Status
                        <select name="status">
                          <option value="started">Started</option>
                          <option value="completed">Completed for today</option>
                          <option value="not-started">Not started</option>
                          <option value="need-help">Need help</option>
                        </select>
                      </label>
                      <label>
                        Shared recording minutes today
                        <input
                          type="number"
                          name="minutes"
                          required
                          min={0}
                          max={1440}
                          defaultValue={0}
                        />
                      </label>
                      <label>
                        Sections / tasks completed today
                        <input
                          type="number"
                          name="units"
                          min={0}
                          max={100000}
                          required
                          defaultValue={0}
                        />
                      </label>
                    </div>
                    <label>
                      Progress notes
                      <textarea
                        name="notes"
                        rows={3}
                        maxLength={1500}
                        placeholder="What did you complete? Is anything blocking you?"
                      />
                    </label>
                    <label>
                      Client account / submission ID
                      <input
                        name="clientId"
                        maxLength={150}
                        placeholder="ID from the client platform"
                      />
                    </label>
                    <label>
                      Google Drive evidence link
                      <input
                        name="proofUrl"
                        type="url"
                        placeholder="https://drive.google.com/…"
                      />
                    </label>
                    <p>
                      For completed work, upload permitted completion proof to
                      your Drive, share it with your coordinator, and paste the
                      link. Do not upload confidential client material without
                      permission.
                    </p>
                    <button>Save daily update</button>
                  </form>
                ) : (
                  <Empty title="Available after approval">
                    Your approved projects will appear here for daily updates.
                  </Empty>
                )}
              </section>
              <section className="suite-card">
                <h2>Activity history</h2>
                {history.length ? (
                  history.map(({ project_progress: r, projects: j }) => (
                    <div className="activity-row" key={r.day + r.projectId}>
                      <span className="activity-dot" />
                      <div>
                        <strong>{j.title}</strong>
                        <p>
                          {r.day} · {r.status} · {r.minutes} min · {r.units}{" "}
                          units
                        </p>
                        {r.notes && <p>{r.notes}</p>}
                        <p>
                          Review: {r.review}{" "}
                          {r.reviewNote && "· " + r.reviewNote}
                        </p>
                        {r.proofUrl && (
                          <a href={r.proofUrl} target="_blank" rel="noreferrer">
                            View submitted proof
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p>Your project reports will appear here.</p>
                )}
                {legacy.length > 0 && (
                  <details>
                    <summary>Earlier workspace reports</summary>
                    {legacy.map((r) => (
                      <p key={r.day}>
                        {r.day} · {r.status} · {r.minutes} minutes · {r.notes}
                      </p>
                    ))}
                  </details>
                )}
              </section>
            </div>
            <aside>
              <section className="suite-card compact">
                <div className="avatar">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <h3>{profile.name}</h3>
                <p>
                  {profile.language}
                  <br />
                  {profile.location || "Location not added"}
                </p>
                <a className="text-link" href="/workspace?edit=1">
                  Edit profile
                </a>
              </section>
              <section className="suite-card compact">
                <Radio size={22} />
                <h3>Announcements</h3>
                {news.length ? (
                  news.map((n) => (
                    <div className="news-item" key={n.id}>
                      <strong>{n.title}</strong>
                      <p>{n.body}</p>
                      <small>{n.created.slice(0, 10)}</small>
                    </div>
                  ))
                ) : (
                  <p>Project announcements will appear here.</p>
                )}
              </section>
              <section className="suite-card compact">
                <h3>Community & support</h3>
                <p>Each approved project has its own community. Open an active project desk to join the correct team after onboarding.</p>
                <a className="text-link" href="/projects">Browse project teams →</a>
              </section>
              <section className="suite-card compact">
                <Wallet size={22} />
                <h3>Payment setup</h3>
                <p>
                  Add your bank details after completing work, or whenever you
                  are ready. Payments follow client QC and your project terms.
                </p>
                <a className="button light" href="/workspace/payments">
                  Manage payment details
                </a>
              </section>
            </aside>
          </div>
        </>
      )}
    </Shell>
  );
}
