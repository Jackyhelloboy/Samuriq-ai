import { getDb } from "../../db";
import { integrations } from "../../db/schema";
import { eq } from "drizzle-orm";
export async function ContentSlot({ slot }: { slot: string }) {
  const r = await getDb()
    .select()
    .from(integrations)
    .where(eq(integrations.id, "content:" + slot))
    .get();
  if (!r) return null;
  let c;
  try {
    c = JSON.parse(r.url);
  } catch {
    return null;
  }
  if (!c.enabled) return null;
  return (
    <section className="custom-content">
      <div>
        {c.title && <h2>{c.title}</h2>}
        <p>{c.body}</p>
      </div>
      {c.url && (
        <a className="button light" href={c.url}>
          {c.label || "Learn more"} ↗
        </a>
      )}
    </section>
  );
}
