import { safeReturn } from "../auth-rate";
import { staffRole } from "../access";
import { getChatGPTUser } from "../chatgpt-auth";
import { loginAccount, createAccount } from "../account-actions";
import { settings } from "../telegram";
import { redirect } from "next/navigation";
import { Brand } from "../marks";
export const dynamic = "force-dynamic";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const q = await searchParams;
  const user = await getChatGPTUser();
  if (user) {
    const staff = await staffRole();
    redirect(
      q.return_to ? safeReturn(q.return_to) : staff ? "/admin" : "/workspace",
    );
  }
  return (
    <main className="login-page">
      <Brand />
      <div>
        <p className="eyebrow">SAMURIQ ACCOUNT</p>
        <h1>
          Your work.
          <br />
          One secure place.
        </h1>
        <p>
          Sign in to manage your projects, report progress and stay connected to
          your team.
        </p>
        {q.error && (
          <p role="alert" style={{ color: "#ffb4ab" }}>
            {(
              {
                login: "Wrong email or password.",
                exists: "That email already has an account. Sign in instead.",
                short: "Password must be at least 8 characters.",
                details: "Enter your name and a valid email.",
                admin:
                  "That email is reserved for the owner. Use your existing sign-in or ChatGPT account.",
              } as Record<string, string>
            )[q.error] || "Something went wrong."}
          </p>
        )}
        <form
          action={loginAccount}
          style={{ display: "grid", gap: 10, maxWidth: 420 }}
        >
          <h2>Sign in</h2>
          <input
            type="hidden"
            name="return_to"
            value={q.return_to || "/workspace"}
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            autoComplete="email"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            autoComplete="current-password"
          />
          <button className="button dark">Sign in</button>
        </form>
        <form
          action={createAccount}
          style={{ display: "grid", gap: 10, maxWidth: 420, marginTop: 28 }}
        >
          <h2>New here? Create an account</h2>
          <input
            type="hidden"
            name="return_to"
            value={q.return_to || "/workspace"}
          />
          <input
            name="name"
            placeholder="Full name"
            required
            autoComplete="name"
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            autoComplete="email"
          />
          <input
            name="password"
            type="password"
            placeholder="Password (8+ characters)"
            required
            minLength={8}
            autoComplete="new-password"
          />

          <button className="button dark">Create account</button>
        </form>
        <small>
          <a href="/signin-with-chatgpt?return_to=/login">
            Continue with ChatGPT instead
          </a>
        </small>
      </div>
      <a href="/">← Back to Samuriq AI</a>
    </main>
  );
}
