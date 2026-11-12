import { accessibleProject } from "../../project-access";
import { Shell, Heading } from "../../components/shell";
import { features } from "../../features";
export const dynamic = "force-dynamic";
export default async function Work({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const q = await searchParams;
  let row;
  try {
    row = await accessibleProject(q.id || "");
  } catch (e) {
    return (
      <Shell active="My projects">
        <Heading
          eyebrow="PROJECT ACCESS"
          title="A few steps before you start."
          description={e instanceof Error ? e.message : "Access unavailable"}
        />
        <div className="actions">
          <a
            className="button dark"
            href={"/projects/onboarding?id=" + encodeURIComponent(q.id || "")}
          >
            Complete onboarding
          </a>
          <a className="button light" href="/workspace">
            My workspace
          </a>
        </div>
      </Shell>
    );
  }
  const j = row.projects,
    flags = await features();
  return (
    <Shell active="My projects">
      <Heading
        eyebrow="YOUR PROJECT DESK"
        title={j.title}
        description="Open your client workspace, stay connected to your approved team and keep your daily record up to date."
      />
      <div className="work-layout evidence-work-layout">
        <aside className="work-rail">
          <span className="badge approved">APPROVED TEAM</span>
          <h2>Ready to work.</h2>
          <p>
            Use your registered email and intended client username on the client
            platform.
          </p>
          {j.inviteCode && (
            <div className="soft-note">
              Mandatory client invitation code<strong>{j.inviteCode}</strong>
            </div>
          )}
          {flags.community && j.communityUrl && (
            <a
              className="button dark"
              href={j.communityUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open Telegram / Discord ↗
            </a>
          )}
          <form
            action="/projects/launch"
            method="post"
            target="client-workspace"
          >
            <input type="hidden" name="projectId" value={j.id} />
            <button>Load client workspace →</button>
            <button className="button light" formTarget="_blank">
              Open in a new tab ↗
            </button>
          </form>
          <a className="button light" href={j.evidenceRequired?"/workspace/evidence":"/workspace#progress"}>
            Evidence & daily record
          </a>
          <p>
            Client login happens on their platform. If embedding is blocked, use
            the new-tab option. Its address becomes visible after opening.
          </p>
        </aside>
        <section className="client-view">
          <div className="client-view-bar">
            <span>CLIENT WORKSPACE</span>
            <span>Your activity remains on the client’s server.</span>
          </div>
          <iframe
            name="client-workspace"
            title="Approved client workspace"
            referrerPolicy="no-referrer"
            src="about:blank"
          />
          <p>
            Your portal records the launch and your reports. Confirm completed
            work through client QC.
          </p>
        </section>
      </div>
    </Shell>
  );
}
