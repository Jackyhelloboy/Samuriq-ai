import SubmitButton from "../components/submit-button";
import PasswordField from "../components/password-field";
import "./account-forms.css";
import {workspaceHome} from "../workspace-context";
import { safeReturn } from "../auth-rate";
import { sessionUser } from "../account";
import { loginAccount, createAccount } from "../account-actions";
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
                short: "Choose a password with 8–128 characters.",
                details: "Enter your name and a valid .com email.",
                verification: "Request an email code and enter it under Create an account.",
                admin:
                  "That email is reserved for the owner. Use your existing owner password sign-in.",
              } as Record<string, string>
            )[q.error] || "Something went wrong."}
          </p>
        )}
        <form
          id="sign-in"
          className="account-form"
          action={loginAccount}
          style={{ display: "grid", gap: 10, maxWidth: 420 }}
        >
          <h2>Sign in</h2>
          <a href="/demo/login">Try the project demo</a>
          <p>Already registered? Use your website account. <a href="#create-account">New here? Create an account</a></p>
          <input
            type="hidden"
            name="return_to"
            value={q.return_to || ""}
          />
          <label htmlFor="signin-email">Email</label>
          <input
            id="signin-email"
            name="email"
            type="email"
            placeholder="Email"
            required
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
          />
          <PasswordField id="signin-password" />
          <SubmitButton className="button dark" pendingLabel="Signing in…">Sign in</SubmitButton>
        </form>
        <form
          id="create-account"
          className="account-form"
          action={createAccount}
          style={{ display: "grid", gap: 10, maxWidth: 420, marginTop: 28 }}
        >
          <h2>New here? Create an account</h2>
          <p>Set up your account, then complete your contributor profile. <a href="#sign-in">Already have an account? Sign in</a></p>
          <input
            type="hidden"
            name="return_to"
            value={q.return_to || ""}
          />
          <label htmlFor="signup-name">Full name</label>
          <input
            id="signup-name"
            name="name"
            placeholder="Full name"
            required
            autoComplete="name"
            maxLength={100}
          />
          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            name="email"
            type="email"
            placeholder="Email"
            required
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
          />
          <a href={"/verify-email?return_to="+encodeURIComponent(q.return_to || "/workspace")}>Get a verification code by email</a>
          <label htmlFor="signup-code">Code from your inbox</label><input id="signup-code" name="code" required maxLength={12} autoComplete="one-time-code"/>
          <PasswordField id="signup-password" creating />

          <SubmitButton className="button dark" pendingLabel="Creating account…">Create account</SubmitButton>
        </form>
        <small>Use your registered email and password. Staff permissions are assigned by management, never selected at sign-up.</small>
      </div>
      <a href="/">← Back to Samuriq AI</a>
    </main>
  );
}
