import SubmitButton from "../components/submit-button";
import {workspaceHome} from "../workspace-context";
import { safeReturn } from "../auth-rate";
import { staffRole } from "../access";
import { sessionUser } from "../account";
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
  const user = await sessionUser();
  if (user) {
    const staff = await staffRole();
    redirect(
      q.return_to ? safeReturn(q.return_to) : await workspaceHome(),
    );
  }
  return (
    <main className="login-page v6-login">
      <Brand />
      <div>
        <p className="eyebrow">SAMURIQ ACCOUNT</p>
        <h1>
          Your work. {" "}
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
                rate: "Too many sign-in attempts. Please wait 15 minutes before trying again. Your account and project data are safe.",
                expired: "This temporary review account has expired. Use your permanent account.",
                restricted:"This account is restricted. Contact your project manager for a review.",
                exists: "That email already has an account. Sign in instead.",
                short: "Password must be at least 8 characters.",
                details: "Enter your name and a valid email.",
                admin:
                  "That email is reserved for the owner. Use your existing owner password sign-in.",
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
            value={q.return_to || ""}
          />
          <input
            aria-label="Email"
            name="email"
            type="email"
            placeholder="Email"
            required
            autoComplete="email"
          />
          <input
            aria-label="Password"
            name="password"
            type="password"
            placeholder="Password"
            required
            autoComplete="current-password"
          />
          <SubmitButton className="button dark" pendingLabel="Signing in…">Sign in</SubmitButton>
        </form>
        <form
          action={createAccount}
          style={{ display: "grid", gap: 10, maxWidth: 420, marginTop: 28 }}
        >
          <h2>New here? Create an account</h2>
          <input
            type="hidden"
            name="return_to"
            value={q.return_to || ""}
          />
          <input
            aria-label="Full name"
            name="name"
            placeholder="Full name"
            required
            autoComplete="name"
          />
          <input
            aria-label="Email"
            name="email"
            type="email"
            placeholder="Email"
            required
            autoComplete="email"
          />
          <input
            aria-label="Password"
            name="password"
            type="password"
            placeholder="Password (8+ characters)"
            required
            minLength={8}
            autoComplete="new-password"
          />

          <SubmitButton className="button dark" pendingLabel="Creating account…">Create account</SubmitButton>
        </form>
        <small>Use your registered email and password. Staff permissions are assigned by management, never selected at sign-up.</small>
      </div>
      <a href="/">← Back to Samuriq AI</a>
    </main>
  );
}
