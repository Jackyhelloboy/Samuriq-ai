import {safeReturn} from "../auth-rate";
import ProfilePreferences from "../components/profile-preferences";
import SubmitButton from "../components/submit-button";
import {RegistrationPolicy} from '../components/registration-policy';
import {getChatGPTUser,chatGPTSignInPath} from '../chatgpt-auth';import {getDb} from '../../db';import {participants} from '../../db/schema';import {eq} from 'drizzle-orm';import {Shell,Heading} from '../components/shell';import {ContributorDashboard} from '../components/contributor-dashboard';import {register} from '../actions';import {ArrowUpRight,UserRound,CheckCircle2} from 'lucide-react';
export const dynamic='force-dynamic';
export default async function Workspace({searchParams}:{searchParams:Promise<Record<string,string>>}){const query=await searchParams,user=await getChatGPTUser(),profile=user?await getDb().select().from(participants).where(eq(participants.id,user.userId)).get():null,source=(query.source||'direct').slice(0,100);if(user&&profile&&!query.edit&&!query.next)return <Shell active="Overview"><ContributorDashboard user={user} profile={profile} projectId={query.project}/></Shell>;
  return (
    <Shell active={query.edit || query.next ? "My profile" : "Overview"}>
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
      {query.error&&<p role="alert" className="notice">{({policy:"Review and accept the current platform agreement before saving your profile.",username:"Use 3–30 letters, digits, dots or underscores. Begin and end with a letter or digit.",taken:"That username is already taken. Choose another username.",details:"Check your name, languages, Telegram username and consent fields.",phone:"Enter a valid contact number with country code.","phone-consent":"Confirm contact consent or leave the number blank.","phone-required":"Add your contact number and consent so your assigned TL can coordinate project work."} as Record<string,string>)[query.error]||"Review the registration fields."}</p>}
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
                "/workspace?source=" + encodeURIComponent(source)+(query.next?"&next="+encodeURIComponent(query.next)+"&edit=1":query.edit?"&edit=1":"")+(query.return_to?"&return_to="+encodeURIComponent(safeReturn(query.return_to)):""),
              )}
            >
              Sign in or create account
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
      ) : !profile || query.edit || query.next ? (
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
            <form action={register} className="profile-form"><input type="hidden" name="return_to" value={query.return_to||''}/>
              <input name="source" type="hidden" value={source} />
              <input name="next" type="hidden" value={query.next || ""} />
              <div className="form-grid"><label>Unique username<input name="username" minLength={3} maxLength={30} pattern="[a-z0-9][a-z0-9._]{1,28}[a-z0-9]" defaultValue={profile?.username} placeholder="rayan_27"/><small>Letters, numbers, dots and underscores. Legal names can be shared; usernames cannot.</small></label>
                <label>
                  Full name
                  <input
                    name="name"
                    required
                    maxLength={100}
                    defaultValue={profile?.name || user.displayName}
                  />
                </label>
                <ProfilePreferences language={profile?.language||""} location={profile?.location||""}/>
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
              <div className="form-grid"><label>Project contact number<input name="phone" type="tel" required={!!query.next} maxLength={18} defaultValue={profile?.phone} placeholder="+91…"/></label><label className="check"><input name="phoneConsent" type="checkbox" required={!!query.next} value="yes" defaultChecked={!!profile?.phoneConsent}/>I allow my assigned team leader and authorized managers to contact me for project coordination. Staff phone numbers are not publicly shared.</label></div>
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
              <RegistrationPolicy/><div className="form-footer">
                <a href="/privacy">Privacy information</a>
                <SubmitButton pendingLabel="Saving profile…">Save my profile <ArrowUpRight size={16}/></SubmitButton>
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
      ) : (<ContributorDashboard user={user} profile={profile} projectId={query.project}/>)}</Shell>);
}
