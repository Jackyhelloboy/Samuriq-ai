import { getChatGPTUser, chatGPTSignInPath } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { projects, onboarding, participants } from "../../../db/schema";
import { and, eq } from "drizzle-orm";
import { Shell, Heading } from "../../components/shell";
import { onboardingVersion, videoMode } from "../../onboarding-state";
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
  if (!j)
    return (
      <Shell>
        <h1>Project unavailable</h1>
      </Shell>
    );
  const p = user
    ? await db
        .select()
        .from(participants)
        .where(eq(participants.id, user.userId))
        .get()
    : null;
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
    complete =
      record && (record.verified || record.watched >= j.tutorialSeconds),
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
      ) : !url ? (
        <div className="soft-note">
          Your coordinator is preparing this project’s tutorial. Please check
          back before applying.
        </div>
      ) : (
        <div className="workspace-columns">
          <section className="suite-card">
            <h2>Watch the project tutorial</h2>
            <TutorialPlayer
              projectId={j.id}
              url={url}
              seconds={j.tutorialSeconds}
              initialWatched={record?.watched || 0}
              mode={videoMode(url)}
            />
          </section>
          <aside>
            <section className="suite-card">
              <h2>Project agreement</h2>
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
                      Terms unlock after recorded playback or coordinator
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
