import SignupForm from "./signup-form";
import SubmitButton from "../components/submit-button";
import PasswordField from "../components/password-field";
import "./account-forms.css";
import {workspaceHome} from "../workspace-context";
import { safeReturn } from "../auth-rate";
import { sessionUser } from "../account";
import { loginAccount } from "../account-actions";
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
    <main className="account-entry">
      <header className="entry-header"><Brand/><a href="/projects">Browse projects <span aria-hidden="true">↗</span></a></header>
      <div className="entry-layout">
        <aside className="entry-photo" aria-label="Project opportunities">
          <picture><source media="(min-width: 860px)" srcSet="/images/team-640.webp 640w, /images/team-1200.webp 1200w" sizes="48vw"/>
            <img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" width="1200" height="800" alt="" /></picture>
          <div><p>Contributor workspace</p><h2>Find your project.<br/><em>Work with your team.</em></h2></div>
        </aside>
        <section className="entry-panel" aria-label="Your account">
        {q.error && (
          <p role="alert" className="account-error">
            {(
              {
                login: "Wrong email or password.",
                rate: "Too many sign-in attempts. Please wait 15 minutes before trying again. Your account and project data are safe.",
                expired: "This temporary review account has expired. Use your permanent account.",
                restricted:"This account is restricted. Contact your project manager for a review.",
                exists: "That email already has an account. Sign in instead.",
                short: "Choose a password with 8–128 characters.",
                mismatch: "Your password and confirmation do not match.",
                details: "Enter your name and a valid .com email.",
                unavailable: "Registration is temporarily unavailable. Contact support if this continues.",
                profile:"Check your age, phone, city and device version.",
                admin:
                  "That email is reserved for the owner. Use your existing owner password sign-in.",
              } as Record<string, string>
            )[q.error] || "Something went wrong."}
          </p>
        )}
        <nav className="account-tabs" aria-label="Account options"><a href="#sign-in">Sign in</a><a href="#create-account">Create an account</a></nav>
        <form
          id="sign-in"
          className="account-form"
          action={loginAccount}
          
        >
          <h1>Welcome back.</h1>
          <p>Sign in to see your projects, team updates and payments.</p>

          
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
        <SignupForm returnTo={q.return_to||""}/>
        <footer className="entry-footer"><a href="/support">Get support</a><a href="/privacy">Privacy</a></footer>
        </section>
      </div>
    </main>
  );
}
