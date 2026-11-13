import {projectState} from "../../project-state";
import { getChatGPTUser, chatGPTSignInPath } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { projects, onboarding, participants } from "../../../db/schema";
import { and, eq } from "drizzle-orm";
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
        description="Complete the tutorial, confirm your project identity, then accept the current requirements."
      />
      <div className="onboarding-steps">
        <span>01 · Profile</span>
        <span>02 · Tutorial</span>
        <span>03 · Terms</span>
        <span>04 · Approval & community</span>
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
            <h2>Complete every required tutorial</h2>{!!j.tutorialReference&&<p className="notice"><strong>Reference video — not client-issued training.</strong> This example is for orientation only. Management must confirm the actual client instructions before work approval. Drive playback needs coordinator confirmation.</p>}
            <p>Watch each video from beginning to end. Seeking and speed controls are disabled in the supported player. Drive and other external embeds require coordinator verification; the website cannot independently prove their full playback.</p>
            {await Promise.all(tutorialEntries(j).map(async(url,i)=>{const lesson=await db.select().from(onboarding).where(and(eq(onboarding.userId,user.userId),eq(onboarding.projectId,lessonKey(j.id,i)),eq(onboarding.version,version))).get();return <section className="tutorial-lesson" key={url}><div className="section-kicker"><h3>{i+1}. {url===j.registerUrl?'Registration guide':url===j.introUrl?'Project introduction':'Work tutorial'}</h3><span className={'badge '+(lesson&&(lesson.verified||lesson.watched>=Math.max(j.tutorialSeconds,lesson.requiredSeconds))?'approved':'')}>{lesson?.verified?'Coordinator verified':lesson&&lesson.watched>=Math.max(j.tutorialSeconds,lesson.requiredSeconds)?'Playback recorded':'Required'}</span></div><TutorialPlayer projectId={lessonKey(j.id,i)} url={url} seconds={Math.max(j.tutorialSeconds,lesson?.requiredSeconds||0)} initialWatched={lesson?.watched||0} mode={videoMode(url)}/></section>}))}
          </section>
          <aside>
            <section className="suite-card">
              <h2>Project agreement</h2>{j.inviteCode&&<div className="invite-code-notice"><span className="eyebrow">MANDATORY TASK INVITATION CODE</span><strong>{j.inviteCode}</strong><p>Enter this code when registering on the client platform. Without this task invitation code, you will not be able to access work under our project. Your TL must confirm registration evidence.</p></div>}
              <div className="terms-text">{j.terms || j.requirements}</div>
              {record?.acceptedAt ? (
                <>
                  <p className="notice">
                    Onboarding accepted {record.acceptedAt.slice(0, 10)}.
                  </p>
                  <a
                    className="button dark"
                    href={"/projects/detail?id=" + encodeURIComponent(j.id)}
                  >
                    Continue to project application →
                  </a>
                </>
              ) : (
                <form action={acceptOnboarding}>
                  <input type="hidden" name="projectId" value={j.id} />
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
                  <label className="check">
                    <input
                      type="checkbox"
                      name="terms"
                      value="yes"
                      required
                      disabled={!complete}
                    />
                    I have completed the tutorial and agree to this project’s
                    requirements and QC terms.
                  </label>
                  <button disabled={!complete}>Accept and continue</button>
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
