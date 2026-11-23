import { requireChatGPTUser } from "../chatgpt-auth";
import { Shell, Heading } from "../components/shell";
import { confirmLink, requestLink } from "./actions";
import { hasVerifiedMailbox } from "./verification";
import SubmitButton from "../components/submit-button";

export const metadata = { referrer: "no-referrer" as const };
export const dynamic = "force-dynamic";

const messages: Record<string, string> = {
  sent: "Check your inbox for a confirmation link.",
  uncertain: "Check your inbox before requesting another link.",
  cooldown: "Wait a minute before requesting another link.",
  limited: "Too many requests. Try again in 15 minutes.",
  unavailable: "We could not send a confirmation link. Contact support for help.",
  invalid: "This link is invalid or expired. Request a new one.",
};

export default async function Verification({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; token?: string }>;
}) {
  const { status, token } = await searchParams;
  const validToken = typeof token === "string" && /^[a-f0-9]{64}$/.test(token);
  const user = await requireChatGPTUser(validToken ? "/verify-email?token=" + token : "/verify-email");
  const verified = await hasVerifiedMailbox(user.email);
  return <Shell>
    <Heading eyebrow="Account" title="Confirm your email" description="Some project and staff actions require a confirmed email address." />
    <section className="suite-card editor-form">
      <p>{user.email}</p>
      {verified ? <><p>Your email is confirmed.</p><a href="/workspace">Return to workspace</a></> : <>
        {status && messages[status] && <p role="status">{messages[status]}</p>}
        {validToken ? <form action={confirmLink}>
          <input type="hidden" name="token" value={token} />
          <SubmitButton pendingLabel="Confirming…">Confirm email</SubmitButton>
        </form> : <form action={requestLink}>
          <SubmitButton pendingLabel="Sending…">Send confirmation link</SubmitButton>
        </form>}
        <a href="/support">Get support</a>
      </>}
    </section>
  </Shell>;
}
