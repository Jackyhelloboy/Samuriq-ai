import { requireOwner } from "../../access";
import { getDb } from "../../../db";
import { integrations } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { Shell, Heading } from "../../components/shell";
import { saveContent } from "../../content-actions";
export const dynamic = "force-dynamic";
export default async function Content({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireOwner();
  const q = await searchParams,
    slot = ["home", "projects", "workspace", "footer"].includes(q.slot)
      ? q.slot
      : "home",
    row = await getDb()
      .select()
      .from(integrations)
      .where(eq(integrations.id, "content:" + slot))
      .get();
  let c: any = {};
  try {
    c = JSON.parse(row?.url || "{}");
  } catch {}
  return (
    <Shell admin active="Content studio">
      <Heading
        eyebrow="PAGE CONTENT STUDIO"
        title="Make room for what’s next."
        description="Publish announcements, help text and calls to action in selected page areas. Changes appear immediately after saving."
      />
      <form className="filter-bar">
        <select name="slot" defaultValue={slot}>
          {["home", "projects", "workspace", "footer"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button>Choose area</button>
      </form>
      <section className="suite-card">
        <form action={saveContent}>
          <input name="slot" type="hidden" value={slot} />
          <label>
            Heading
            <input name="title" maxLength={120} defaultValue={c.title} />
          </label>
          <label>
            Page content
            <textarea
              name="body"
              rows={8}
              maxLength={3000}
              defaultValue={c.body}
            />
          </label>
          <div className="form-grid">
            <label>
              Button label
              <input name="label" defaultValue={c.label} maxLength={60} />
            </label>
            <label>
              Button destination
              <input name="url" defaultValue={c.url} />
            </label>
          </div>
          <label className="check">
            <input
              name="enabled"
              type="checkbox"
              value="yes"
              defaultChecked={c.enabled}
            />
            Display this block
          </label>
          <button>Publish content</button>
        </form>
      </section>
      <p>
        Content is rendered as safe text. Application code changes go through
        your GitHub source and deployment process.
      </p>
    </Shell>
  );
}
