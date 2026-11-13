import {projectState} from "../../project-state";
import { getChatGPTUser, chatGPTSignInPath } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { projects, onboarding, participants, applications } from "../../../db/schema";
import { and, eq, or } from "drizzle-orm";
import { Shell, Heading } from "../../components/shell";
import { onboardingVersion, videoMode,tutorialEntries,lessonKey,allLessonsComplete } from "../../onboarding-state";
import TutorialPlayer from "../../components/tutorial-player";
import { acceptOnboarding } from "../../onboarding-actions";
export const dynamic = "force-dynamic";
export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const q = await searchParams,
    user = await getChatGPTUser(),
    db = getDb(),
    j = await db
      .select()
      .from(projects)
      .where(eq(projects.id, q.id || ""))
      .get();
  if (!j || j.archivedAt)
    return (
      <Shell>
        <h1>Project unavailable</h1>
      </Shell>
    );
  if(projectState(j)!=="online")return <Shell><Heading eyebrow="PROJECT CLOSED" title="Onboarding is closed." description="The coordinator must activate this project before you can continue."/><a href="/projects">Back to projects</a></Shell>;
  const p = user
    ? await db
        .select()
        .from(participants)
        .where(eq(participants.id, user.userId))
        .get()
    : null;
  const application=user?await db.select().from(applications).where(and(eq(applications.projectId,j.id),or(eq(applications.userId,user.userId),eq(applications.partnerEmail,user.email.toLowerCase())))).get():null;
  const telegram= user?await (await import("../../telegram-identity")).telegramIdentity(user.userId):null;
  const version = await onboardingVersion(j),
    record = user
      ? await db
          .select()
          .from(onboarding)
          .where(
            and(
              eq(onboarding.userId, user.userId),
              eq(onboarding.projectId, j.id),
              eq(onboarding.version, version),
            ),
          )
          .get()
      : null,
    complete = user ? await allLessonsComplete(user.userId,j) : false,
    url = j.tutorialUrl || j.registerUrl;
  return (
    <Shell active="Find projects">
      <Heading
        eyebrow="PROJECT ONBOARDING"
        title={j.title}
        description="Watch the video, accept the terms and submit once. Your client desk is the next screen."
      />
      {q.error&&<p className="notice" role="alert">Check your partner’s separate email and your availability before submitting. Your recorded tutorial progress is saved.</p>}
      <div className="onboarding-steps">
        <span>1 · Watch</span><span>2 · Agree & submit</span><span>3 · Client desk</span>
      </div>
      {!user ? (
        <a
          className="button dark"
          href={chatGPTSignInPath("/projects/onboarding?id=" + j.id)}
        >
          Sign in to start
        </a>
      ) : !p ? (
        <a
          className="button dark"
          href={"/workspace?next=" + encodeURIComponent(j.id)}
        >
          Complete your profile
        </a>
      ) : j.telegramRequired&&!telegram?.username ? (<section className="suite-card telegram-gate"><span className="badge">NEXT · VERIFY TELEGRAM</span><h2>Connect Telegram before training.</h2><p>Open your Project Assistant bot and press Start. We verify the account and username automatically; typing a username is not proof.</p><a className="button dark" href={"/workspace/telegram?next="+encodeURIComponent("/projects/onboarding?id="+j.id)}>Verify my Telegram</a><p>Your project and progress stay saved while you switch apps.</p></section>) : !url ? (
        <div className="soft-note">
          Your coordinator is preparing this project’s tutorial. Please check
          back before applying.
        </div>
      ) : (
        <div className="workspace-columns">
          <section className="suite-card">
            <h2>Complete every required tutorial</h2>{!!j.tutorialReference&&<p className="notice"><strong>Reference video — not client-issued training.</strong> This example is for orientation only. Management must confirm the actual client instructions before work approval. Playback is recorded in this player; you do not need to open Drive.</p>}
            <p>Watch from beginning to end in this player. Your progress is saved and the form below unlocks automatically. External providers that do not report playback still require coordinator verification.</p>
            {await Promise.all(tutorialEntries(j).map(async(url,i)=>{const lesson=await db.select().from(onboarding).where(and(eq(onboarding.userId,user.userId),eq(onboarding.projectId,lessonKey(j.id,i)),eq(onboarding.version,version))).get();return <section className="tutorial-lesson" key={url}><div className="section-kicker"><h3>{i+1}. {url===j.registerUrl?'Registration guide':url===j.introUrl?'Project introduction':'Work tutorial'}</h3><span className={'badge '+(lesson&&(lesson.verified||lesson.watched>=Math.max(j.tutorialSeconds,lesson.requiredSeconds))?'approved':'')}>{lesson?.verified?'Coordinator verified':lesson&&lesson.watched>=Math.max(j.tutorialSeconds,lesson.requiredSeconds)?'Playback recorded':'Required'}</span></div><TutorialPlayer projectId={lessonKey(j.id,i)} url={url} seconds={Math.max(j.tutorialSeconds,lesson?.requiredSeconds||0)} initialWatched={lesson?.watched||0} mode={videoMode(url)}/></section>}))}
          </section>
          <aside>
            <section className="suite-card" id="project-agreement">
              <h2>Agree, submit & open your client desk</h2>{j.inviteCode&&<div className="invite-code-notice"><span className="eyebrow">MANDATORY TASK INVITATION CODE</span><strong>{j.inviteCode}</strong><p>Enter this code when registering on the client platform. Without this task invitation code, you will not be able to access work under our project. Your TL must confirm registration evidence.</p></div>}
              <div className="terms-text">{j.terms || j.requirements}</div>
              {record?.acceptedAt && application ? (
                <>
                  <p className="notice">
                    Onboarding accepted {record.acceptedAt.slice(0, 10)}.
                  </p>
                  <a
                    className="button dark"
                    href={"/projects/work?id=" + encodeURIComponent(j.id)+"&launch=1"}
                  >
                    Open my client workspace →
                  </a>
                </>
              ) : (
                <form action={acceptOnboarding}>
                  <input type="hidden" name="projectId" value={j.id} /><input type="hidden" name="submitApplication" value={!application?"yes":"no"}/><input type="hidden" name="consent" value="yes"/>
                  <label>
                    Email for the client platform
                    <input
                      name="clientEmail"
                      type="email"
                      value={user.email}
                      readOnly
                    />
                  </label>
                  <label>
                    Intended client username
                    <input
                      name="clientUsername"
                      required
                      maxLength={100}
                      defaultValue={record?.clientUsername||p.username}
                      readOnly={!!record?.acceptedAt}
                      disabled={!complete}
                    />
                  </label>
                  <p>
                    Use this same email and username when registering on the
                    client platform. Your coordinator will reconcile your
                    details; external registration cannot be verified
                    automatically.
                  </p>
                  {j.inviteCode&&<label>Type the mandatory task invite code<input name="inviteCode" required disabled={!complete} autoComplete="off" placeholder={j.inviteCode}/></label>}
                  {!application&&<><input type="hidden" name="communityHandle" value={telegram?.username?'@'+telegram.username:p.telegram||p.username}/>{j.pair===1&&<><label>Permanent partner’s name<input name="partner" required disabled={!complete} maxLength={100}/></label><label>Partner’s separate sign-in email<input name="partnerEmail" type="email" required disabled={!complete}/><small>Your partner must confirm through their own website account.</small></label></>}<label>Availability & project answers<textarea name="experience" required disabled={!complete} maxLength={2000} rows={2} placeholder="When can you work? Include any answers requested in the project brief." defaultValue={p.skills}/></label>{j.questions&&<p className="preserve">{j.questions}</p>}</>}
                  <label className="check">
                    <input
                      type="checkbox"
                      name="terms"
                      value="yes"
                      required
                      disabled={!complete}
                    />
                    I completed the tutorial, agree to the project requirements and QC terms, and submit these details. My partner must consent separately.
                  </label>
                  <button disabled={!complete}>Accept and continue · submit & open client desk</button><p className="small-note">Approved contributors go straight to the embedded client. If approval, partner confirmation or folder checks are pending, the next screen shows exactly what remains.</p>
                  {!complete && (
                    <p>
                      Terms unlock only after all required videos have recorded playback or coordinator
                      verification.
                    </p>
                  )}
                </form>
              )}
            </section>
          </aside>
        </div>
      )}
    </Shell>
  );
}
