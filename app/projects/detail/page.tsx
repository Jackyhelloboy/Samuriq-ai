import {contractVersion} from '../../vendor-policy';
import {applicationLocks} from '../../enrollment';
import {requestProjectPermission,acceptAssignedRate} from '../../enrollment-actions';
import {money} from "../../team-access";
import {staffRole} from "../../access";
import { onboardingVersion } from "../../onboarding-state";
import { onboarding } from "../../../db/schema";
import { projectState, stateLabel, embedUrl } from "../../project-state";
import { features } from "../../features";
import { getDb } from "../../../db";
import { projects, applications, participants,teamMembers } from "../../../db/schema";
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
  if (!job || job.archivedAt)
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
  if(projectState(job)!=="online"&&!(await staffRole()))return <Shell active="Find projects"><Heading eyebrow="PROJECT CLOSED" title="This project is currently closed." description="Project details, registration, tutorials and work access unlock when an admin or manager activates the project."/><a className="button light" href="/projects">Back to projects</a></Shell>;
  const membership=user?await db.select().from(teamMembers).where(and(eq(teamMembers.userId,user.userId),eq(teamMembers.projectId,job.id))).get():null;
  const locks=user?await applicationLocks(user.userId,job.id):[];
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
      {job.id==='speech-pair'&&<section className="project-offer suite-card"><div><p className="eyebrow">HINDI / PERMANENT-PAIR RECORDING</p><h2>Flexible work. Clear requirements.</h2><p>Laptop or Android mobile · stable internet · quiet recording space · two separately registered participants.</p></div><div className="offer-rates"><div><strong>₹250</strong><span>per person / QC-approved hour</span></div><div><strong>₹500</strong><span>per pair / QC-approved hour</span></div></div><p className="small-note">Direct Samuriq contributor rate. Keep the same approved partner throughout the project. Only client-QC-approved work is payable. Add payment details in your workspace; payment follows client QC, settlement review and your accepted terms. Vendor-team members follow their separately accepted payroll terms. No joining fee.</p></section>}
      {q.notice&&<p className="notice" role="status">{q.notice==="tl-role"?"Your profile was saved. A manager must approve a role change before you can join another TL’s team.":q.notice==="permission-required"?"Your profile was saved. Request permission from your current TL below before applying to this additional project.":"Review the project requirements before continuing."}</p>}
      {locks.length>0&&<section className="suite-card"><span className="badge">TL PERMISSION REQUIRED</span><h2>Ask your current team before applying.</h2><p>Each active team leader must approve your additional project. Your existing team does not change.</p><form action={requestProjectPermission}><input type="hidden" name="projectId" value={job.id}/><label>How will you manage both commitments?<textarea name="reason" required minLength={10} maxLength={1000}/></label><button>Request TL permission</button></form></section>}
      {job.enrollmentOnly===1&&<section className="suite-card"><span className="badge approved">ACTIVE</span><h2>Apply now. Complete onboarding before work.</h2><p>This project is active. Client access opens after required tutorials, your project community, team approval and evidence-folder checks. Your checklist shows any setup still required.</p><a className="button dark" href={'/workspace?edit=1&next='+job.id}>Register / update my profile</a></section>}
      {membership&&!membership.rateAccepted&&<section className="suite-card"><h2>Your team assignment is ready.</h2>{membership.effectiveFrom&&<p>Payment assignment effective {membership.effectiveFrom}. Earlier work retains its recorded beneficiary and rate.</p>}{membership.vendorFrom?<><span className="badge">VENDOR-MANAGED PAYROLL</span><p>Your vendor receives the Samuriq settlement and is responsible for your individual payment. The owner's vendor budget is not your individual offer.</p><p className="preserve">{membership.payrollTerms||'Your vendor must provide written payroll terms before you can accept.'}</p></>:<p>Your individual contractual rate is {money(membership.ratePaise)} per client-QC-approved hour. Payment follows QC, owner review and your accepted terms.</p>}<form action={acceptAssignedRate}><input type="hidden" name="projectId" value={job.id}/>{membership.vendorFrom?<input type="hidden" name="termsVersion" value={await contractVersion(membership)}/>:<input type="hidden" name="rate" value={membership.ratePaise}/>}<label className="check"><input type="checkbox" name="consent" value="yes" required/>I accept my assigned team’s private terms and understand who is responsible for paying me.</label><button disabled={!!membership.vendorFrom&&membership.payrollTerms.length<20}>Accept assigned team terms</button></form></section>}
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
          <h3>Payment responsibility</h3><p>{membership?.vendorFrom?'Vendor-managed payroll. Your assigned vendor pays you under your private agreement. Samuriq pays the vendor after client QC, target checks and owner review.':membership?'Direct Samuriq payments follow your accepted individual contract and owner settlement review.':'Your payment route and private terms are confirmed with your team assignment. No joining fee is required.'}</p>{membership?.vendorFrom&&membership.rateAccepted===1&&<details><summary>My accepted vendor payroll terms</summary><p className="preserve">{membership.payrollTerms}</p></details>}
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
            ) : locks.length ? (<p>Application locked until your current TL approves your request above.</p>) : !job.active || !flags.applications ? (
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
