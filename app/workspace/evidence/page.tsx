import { MyScreenshots } from '../../components/screenshot-evidence';
import { Shell, Heading } from '../../components/shell';
import { getChatGPTUser } from '../../chatgpt-auth';
import { getDb } from '../../../db';
import { projects, applications, pairReviews } from '../../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { myPairs, pairContext, publicCode } from '../../evidence-access';
export const dynamic = 'force-dynamic';

export default async function Evidence() {
  const user = await getChatGPTUser();
  if (!user) return <Shell><Heading eyebrow="PRIVATE EVIDENCE" title="Sign in to see your submissions." description="Your screenshots and reports are private to you and authorized project reviewers." /><a className="button dark" href="/login?return_to=%2Fworkspace%2Fevidence">Sign in</a></Shell>;
  const db = getDb(), pairs = await myPairs();
  const individual = await db.select().from(applications).innerJoin(projects, eq(projects.id, applications.projectId))
    .where(and(eq(applications.userId, user.userId), eq(applications.status, 'approved'), eq(projects.pair, 0), eq(projects.archivedAt, '')));
  return <Shell active="Evidence & attendance">
    <Heading eyebrow="MY PRIVATE SUBMISSIONS" title="Your work. Your evidence." description="Upload screenshots here after completing a section. Track reviewer feedback without connecting Google Drive or Telegram." action={<a className="button light" href="/support">Get help</a>} />
    <p className="soft-note">Contributor ID: <strong>{await publicCode('contributor', user.userId)}</strong>. A screenshot review records evidence; it does not confirm client QC or payment.</p>
    {!pairs.length && !individual.length && <section className="suite-card"><h2>Your approved projects appear here.</h2><p>Complete your profile and project approval. For paired work, both contributors must confirm the pairing.</p><a className="button dark" href="/workspace">Go to my workspace</a></section>}
    {individual.map(({ projects: project }) => <section key={project.id} className="evidence-project"><h2>{project.title}</h2><MyScreenshots projectId={project.id} userId={user.userId} /></section>)}
    {await Promise.all(pairs.map(async application => {
      let pair;
      try { pair = await pairContext(application.projectId, application.userId); } catch { return null; }
      const project = await db.select().from(projects).where(eq(projects.id, application.projectId)).get();
      if (!project || project.archivedAt) return null;
      const reviews = await db.select().from(pairReviews).where(and(eq(pairReviews.projectId, project.id), eq(pairReviews.leadId, application.userId))).orderBy(desc(pairReviews.day)).limit(60);
      return <section key={project.id} className="evidence-project">
        <div className="section-kicker"><div><span className="badge">{pair.pairId}</span><h2>{project.title}</h2><p>{pair.first.name} + {pair.second.name}</p></div><a href="/support">Report a discrepancy</a></div>
        <MyScreenshots projectId={project.id} userId={user.userId} />
        <section className="suite-card"><h2>Daily review from your team leader</h2><p>Your partner uploads from their own account. Team leaders inspect both contributors’ submissions before publishing a daily review.</p>
          <div className="table-scroll"><table className="suite-table"><thead><tr><th>Date</th><th>Pair output</th><th>Screenshots</th><th>Feedback</th></tr></thead><tbody>
            {reviews.map(review => <tr key={review.day}><td><strong>{review.day}</strong><small>{review.attendance}</small></td><td>{review.sections} sections<small>{review.minutes} pair minutes</small></td><td>{review.firstShots} / {review.secondShots}</td><td>{review.feedback}<small>Updated {review.updated.slice(0, 16).replace('T', ' ')} UTC</small></td></tr>)}
          </tbody></table></div>
          {!reviews.length && <p>No daily review yet. Your uploaded screenshots stay saved while your team reviews them.</p>}
        </section>
      </section>;
    }))}
  </Shell>;
}
