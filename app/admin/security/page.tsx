import { requireOwnerView as requireOwner } from "../../access";
import { Shell, Heading } from "../../components/shell";
import { setOwnerPassword } from "../../owner-password-action";
export const dynamic = "force-dynamic";
export default async function Security({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const owner = await requireOwner(),
    q = await searchParams;
  return (
    <Shell admin active="Security">
      <Heading
        eyebrow="OWNER SECURITY"
        title="Your account. Your control."
        description="Set your own website password while signed in with your authorized owner account."
      />
      {q.saved && (
        <p className="notice" role="status">
          Owner password saved.
        </p>
      )}
      <section className="suite-card">
        <h2>{owner.email}</h2>
        <form action={setOwnerPassword}>
          <label>
            New password
            <input
              type="password"
              name="password"
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
            />
          </label>
          <label>
            Confirm password
            <input
              type="password"
              name="confirm"
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
            />
          </label>
          <button>Save my password</button>
        </form>
        <p>
          This configures your existing owner identity. Manager appointment
          never grants owner access.
        </p>
      </section>
    </Shell>
  );
}
