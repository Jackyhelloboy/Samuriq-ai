import { requireOwner } from "../../../access";
import { getDb } from "../../../../db";
import { projects } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import { publishProject } from "../../../project-actions";
import { Shell, Heading } from "../../../components/shell";
export const dynamic = "force-dynamic";
export default async function Editor({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireOwner();
  const q = await searchParams;
  const job = q.id
    ? await getDb().select().from(projects).where(eq(projects.id, q.id)).get()
    : null;
  if (q.id && !job)
    return (
      <Shell admin>
        <h1>Project not found</h1>
      </Shell>
    );
  return (
    <Shell admin active="Projects">
      <Heading
        eyebrow="CLIENT BRIEF STUDIO"
        title={job ? "Refine the project." : "Build your next project."}
        description="Turn a client brief into an opportunity with clear requirements, compensation and access instructions."
      />
      <form action={publishProject} className="editor-form">
        <input name="id" value={job?.id || ""} type="hidden" />
        <div className="workspace-columns">
          <div>
            <section className="suite-card">
              <span className="badge">01 · PROJECT IDENTITY</span>
              <h2>The opportunity</h2>
              <label>
                Project title
                <input
                  name="title"
                  maxLength={120}
                  required
                  defaultValue={job?.title}
                  placeholder="e.g. Hindi conversation recording"
                />
              </label>
              <div className="form-grid">
                <label>
                  Category
                  <select name="category" defaultValue={job?.category}>
                    {[
                      "AI training",
                      "Data annotation",
                      "Speech & audio",
                      "Human motion & POV",
                      "AI evaluation",
                      "Research & other",
                    ].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Location / eligibility region
                  <input
                    name="location"
                    maxLength={200}
                    defaultValue={job?.location || "Remote · India"}
                  />
                </label>
              </div>
              <label>
                What contributors will do
                <textarea
                  name="description"
                  rows={6}
                  required
                  maxLength={4000}
                  defaultValue={job?.description}
                  placeholder="Describe the work, expected output and project objective."
                />
              </label>
            </section>
            <section className="suite-card">
              <span className="badge">02 · CLIENT REQUIREMENTS</span>
              <h2>Make expectations clear.</h2>
              <label>
                Eligibility, equipment, workflow and QC
                <textarea
                  name="requirements"
                  rows={8}
                  required
                  maxLength={2000}
                  defaultValue={job?.requirements}
                  placeholder={
                    "Languages and eligibility:\nRequired equipment:\nTask workflow:\nQuality criteria:\nSubmission process:\nPayment timeline:"
                  }
                />
              </label>
              <label>
                Compensation / rate
                <input
                  name="rate"
                  required
                  maxLength={200}
                  defaultValue={job?.rate}
                  placeholder="Include currency, per-task or hourly basis, and QC conditions"
                />
              </label>
              <div className="form-grid">
                <label>
                  Recording target (pair hours)
                  <input
                    name="targetHours"
                    type="number"
                    min={0}
                    max={168}
                    step="0.5"
                    defaultValue={(job?.targetMinutes || 0) / 60}
                  />
                </label>
                <label>
                  QC rate (₹ per pair-hour)
                  <input
                    name="hourlyRate"
                    type="number"
                    min={0}
                    defaultValue={job?.hourlyRate || 0}
                  />
                </label>
                <label>
                  Target period starts
                  <input
                    type="date"
                    name="targetStart"
                    defaultValue={job?.targetStart}
                  />
                </label>
                <label>
                  Deadline (end of day, India)
                  <input
                    type="date"
                    name="deadline"
                    defaultValue={job?.deadline}
                  />
                </label>
              </div>
              <label className="check">
                <input
                  type="checkbox"
                  name="onboardingRequired"
                  value="yes"
                  defaultChecked={job ? !!job.onboardingRequired : true}
                />
                Require tutorial and terms before applying
              </label>
              <label>
                Minimum tutorial playback (seconds)
                <input
                  name="tutorialSeconds"
                  type="number"
                  min={5}
                  max={14400}
                  defaultValue={job?.tutorialSeconds || 60}
                />
              </label>
              <label>
                Project terms and participant commitments
                <textarea
                  name="terms"
                  rows={7}
                  maxLength={5000}
                  defaultValue={job?.terms}
                  placeholder="Project workflow, reporting duties, client registration identity, quality requirements and payment terms."
                />
              </label>
              <label>
                Questions for applicants
                <textarea
                  name="questions"
                  rows={4}
                  maxLength={2000}
                  defaultValue={job?.questions}
                  placeholder="Add each question on a new line. Applicants answer these when applying."
                />
              </label>
              <label className="check">
                <input
                  name="pair"
                  type="checkbox"
                  value="yes"
                  defaultChecked={!!job?.pair}
                />
                This assignment requires two participants
              </label>
            </section>
          </div>
          <aside>
            <section className="suite-card">
              <span className="badge">03 · CLIENT ACCESS</span>
              <h3>Work destination</h3>
              <p>
                The client link and invite code are shown to approved applicants
                in their workspace.
              </p>
              <label>
                Client platform URL
                <input
                  name="clientUrl"
                  type="url"
                  defaultValue={job?.clientUrl}
                  placeholder="https://client-platform.com"
                />
              </label>
              <label>
                Preview / introduction video link (YouTube, Google Drive, Vimeo
                or any link)
                <input
                  name="introUrl"
                  type="url"
                  defaultValue={job?.introUrl}
                  placeholder="https://youtu.be/..."
                />
              </label>
              <label>
                Tutorial video link: how to do the work
                <input
                  name="tutorialUrl"
                  type="url"
                  defaultValue={job?.tutorialUrl}
                />
              </label>
              <label>
                Registration video link: how to register on this website
                <input
                  name="registerUrl"
                  type="url"
                  defaultValue={job?.registerUrl}
                />
              </label>
              <label>
                Private Telegram / Discord invite
                <input
                  name="communityUrl"
                  type="url"
                  defaultValue={job?.communityUrl}
                />
              </label>
              <p>
                Use a private group with join approval or a restricted Discord
                role. This invite is shown only after application approval.
                Confirm handles manually before granting work access.
              </p>
              <label>
                Required invitation code
                <input
                  name="inviteCode"
                  maxLength={100}
                  defaultValue={job?.inviteCode}
                />
              </label>
            </section>
            <section className="suite-card">
              <h3>Publication</h3>
              <label>
                Status
                <select name="active" defaultValue={job?.active ? "1" : "0"}>
                  <option value="0">Draft / applications closed</option>
                  <option value="1">Published · applications open</option>
                </select>
              </label>
              <p>
                Published projects appear on the marketplace and homepage
                automatically.
              </p>
              <button>Save project</button>
              <a className="text-link" href="/admin/projects">
                Return to projects
              </a>
            </section>
            <div className="soft-note">
              Client reports are prepared from your team’s daily submissions. No
              client API is required. Record client QC decisions manually.
            </div>
          </aside>
        </div>
      </form>
    </Shell>
  );
}
