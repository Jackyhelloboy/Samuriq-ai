import { onboardingVersion } from "../../onboarding-state";
import { onboarding } from "../../../db/schema";
import { projectState, stateLabel, embedUrl } from "../../project-state";
import { features } from "../../features";
import { getDb } from "../../../db";
import { projects, applications, participants } from "../../../db/schema";
import { eq, and } from "drizzle-orm";
import { getChatGPTUser, chatGPTSignInPath } from "../../chatgpt-auth";
import { Shell, Heading } from "../../components/shell";
import { applyProject } from "../../project-actions";
export const dynamic = "force-dynamic";
export default async function Detail({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const flags = await features();
  const q = await searchParams,
    db = getDb(),
    user = await getChatGPTUser();
  const job = await db
    .select()
    .from(projects)
    .where(eq(projects.id, q.id || ""))
    .get();
  if (!job)
    return (
      <Shell>
        <Heading
          eyebrow="PROJECT"
          title="Project unavailable"
          description="This project could not be found."
        />
        <a href="/projects">Back to opportunities</a>
      </Shell>
    );
  const application = user
    ? await db
        .select()
        .from(applications)
        .where(
          and(
            eq(applications.userId, user.userId),
            eq(applications.projectId, job.id),
          ),
        )
        .get()
    : null;
  const profile = user
    ? await db
        .select()
        .from(participants)
        .where(eq(participants.id, user.userId))
        .get()
    : null;
  const gate = user
    ? await db
        .select()
        .from(onboarding)
        .where(
          and(
            eq(onboarding.userId, user.userId),
            eq(onboarding.projectId, job.id),
          ),
        )
        .get()
    : null;
  const onboardingComplete =
    !job.onboardingRequired ||
    (gate?.version === (await onboardingVersion(job)) && !!gate?.acceptedAt);
  return (
    <Shell active="Find projects">
      <a className="back-link" href="/projects">
        ← All opportunities
      </a>
      <Heading
        eyebrow={job.category}
        title={job.title}
        description={
          job.location +
          " · " +
          (job.pair ? "Two participants required" : "Individual contribution")
        }
      />
      <div className="workspace-columns">
        <section className="suite-card" style={{ gridColumn: "1 / -1" }}>
          <h2>Status and videos</h2>
          <p>
            <span
              className={
                "badge" + (projectState(job) === "online" ? " approved" : "")
              }
            >
              {stateLabel(projectState(job))}
            </span>
            {job.deadline
              ? "  Deadline " + job.deadline + " (India time, end of day)"
              : ""}
          </p>
          {projectState(job) === "paused" && (
            <p>
              This project is paused because its deadline has passed.
              Applications and updates are closed.
            </p>
          )}
          {(
            [
              ["Introduction", job.introUrl],
              ["How to register", job.registerUrl],
              ["Tutorial: how to do the work", job.tutorialUrl],
            ] as [string, string][]
          )
            .filter(([, u]) => u)
            .map(([t, u]) => {
              const e = embedUrl(u);
              return (
                <div key={t} style={{ margin: "16px 0" }}>
                  <h3>{t}</h3>
                  {e ? (
                    <div style={{ position: "relative", paddingTop: "56.25%" }}>
                      <iframe
                        src={e}
                        title={t}
                        allowFullScreen
                        loading="lazy"
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          border: 0,
                        }}
                      />
                    </div>
                  ) : (
                    <a
                      className="button light"
                      href={u}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open video ↗
                    </a>
                  )}
                </div>
              );
            })}
        </section>
        <section className="suite-card">
          <h2>Project overview</h2>
          <p className="preserve">{job.description}</p>
          <h3>Requirements & quality expectations</h3>
          <p className="preserve">{job.requirements}</p>
          <h3>Compensation</h3>
          <p>{job.rate}</p>
          {job.questions && (
            <>
              <h3>Application questions</h3>
              <p className="preserve">{job.questions}</p>
            </>
          )}
        </section>
        <aside>
          <section className="suite-card">
            <span className="badge">
              {job.active ? "APPLICATIONS OPEN" : "CLOSED"}
            </span>
            <h2>{application ? "Your application" : "Ready to contribute?"}</h2>
            {application ? (
              <>
                <p className={"badge " + application.status}>
                  {application.status}
                </p>
                <p>
                  Follow your application and daily progress from your
                  workspace.
                </p>
                <a className="button dark" href="/workspace">
                  Open my workspace
                </a>
              </>
            ) : !job.active || !flags.applications ? (
              <p>Applications are closed for this project.</p>
            ) : !user ? (
              <a
                className="button dark"
                target="_top"
                href={chatGPTSignInPath(
                  "/projects/detail?id=" + encodeURIComponent(job.id),
                )}
              >
                Sign in to apply
              </a>
            ) : !profile ? (
              <>
                <p>Create your profile before submitting an application.</p>
                <a
                  className="button dark"
                  href={
                    "/workspace?next=" +
                    encodeURIComponent(job.id) +
                    "&source=" +
                    encodeURIComponent(q.source || "direct")
                  }
                >
                  Create profile
                </a>
              </>
            ) : !onboardingComplete ? (
              <>
                <p>
                  Watch the required tutorial and accept the project terms
                  before applying.
                </p>
                <a
                  className="button dark"
                  href={"/projects/onboarding?id=" + encodeURIComponent(job.id)}
                >
                  Start project onboarding →
                </a>
              </>
            ) : (
              <form action={applyProject}>
                <input name="projectId" type="hidden" value={job.id} />
                {job.pair && (
                  <label>
                    Permanent partner’s name
                    <input name="partner" required maxLength={100} />
                  </label>
                )}
                {job.pair === 1 && (
                  <label>
                    Permanent partner’s sign-in email
                    <input name="partnerEmail" type="email" required />
                    <small>
                      Your partner must register with this email and confirm the
                      pairing. Only the pair lead submits the shared daily
                      report.
                    </small>
                  </label>
                )}
                <label>
                  Telegram or Discord username
                  <input name="communityHandle" required maxLength={100} />
                </label>
                <label>
                  Skills, availability & answers to the questions
                  <textarea
                    name="experience"
                    rows={6}
                    maxLength={2000}
                    required
                  />
                </label>
                <label className="check">
                  <input type="checkbox" name="consent" value="yes" required />I
                  have reviewed the project requirements. My partner has agreed
                  to participate if required.
                </label>
                <button>Submit application</button>
              </form>
            )}
          </section>
        </aside>
      </div>
    </Shell>
  );
}
