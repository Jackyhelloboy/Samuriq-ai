import { requireOwner } from "../../access";
import { features, featureDefinitions } from "../../features";
import { saveFeatures } from "../../control-actions";
import { Shell, Heading } from "../../components/shell";
export const dynamic = "force-dynamic";
export default async function Settings({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireOwner(),
    flags = await features(),
    q = await searchParams;
  return (
    <Shell admin active="Controls">
      <Heading
        eyebrow="OWNER CONTROLS"
        title="Your platform. Your rules."
        description="Pause individual workflows without deleting projects, reports or contributor data."
      />
      {q.saved && (
        <p className="notice" role="status">
          Controls updated.
        </p>
      )}
      <form action={saveFeatures} className="suite-card">
        {featureDefinitions.map(([id, title, description]) => (
          <label className="control-row" key={id}>
            <span>
              <strong>{title}</strong>
              <small>{description}</small>
            </span>
            <input
              type="checkbox"
              role="switch"
              name={id}
              defaultChecked={flags[id]}
            />
          </label>
        ))}
        <button>Save platform controls</button>
      </form>
      <section className="suite-card">
        <h2>Owner access</h2>
        <p>
          Authorized account: <strong>{user.email}</strong>
        </p>
        <p>
          Administrative actions are verified on the server. Contributors sign
          in through the same website and cannot access owner tools.
          Payment-detail reveals are separately audited.
        </p>
        <p>
          Authentication is provided by Sign in with ChatGPT. No separate
          website password is stored here.
        </p>
      </section>
    </Shell>
  );
}
