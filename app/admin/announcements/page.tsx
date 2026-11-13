import { requireOwnerView as requireOwner } from "../../access";
import { getDb } from "../../../db";
import { notices } from "../../../db/schema";
import { desc } from "drizzle-orm";
import { announce } from "../../suite-actions";
import { Shell, Heading } from "../../components/shell";
export const dynamic = "force-dynamic";
export default async function Announcements() {
  await requireOwner();
  const rows = await getDb()
    .select()
    .from(notices)
    .orderBy(desc(notices.created))
    .limit(30);
  return (
    <Shell admin active="Announcements">
      <Heading
        eyebrow="CONTRIBUTOR COMMUNICATIONS"
        title="Keep your people informed."
        description="Publish announcements to the signed-in contributor workspace."
      />
      <div className="workspace-columns">
        <section className="suite-card">
          <h2>New announcement</h2>
          <p>Visible to all contributors when they open their workspace.</p>
          <form action={announce}>
            <label>
              Title
              <input name="title" required maxLength={120} />
            </label>
            <label>
              Message
              <textarea name="body" required rows={8} maxLength={3000} />
            </label>
            <button>Publish announcement</button>
          </form>
        </section>
        <section className="suite-card">
          <h2>Recent announcements</h2>
          {rows.length ? (
            rows.map((n) => (
              <article className="news-item" key={n.id}>
                <span className="badge">{n.created.slice(0, 10)}</span>
                <h3>{n.title}</h3>
                <p className="preserve">{n.body}</p>
              </article>
            ))
          ) : (
            <p>No announcements published yet.</p>
          )}
        </section>
      </div>
    </Shell>
  );
}
