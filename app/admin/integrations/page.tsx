import {ensureTelegramSetup} from "../../telegram-setup";
import { requireOwnerView as requireOwner } from "../../access";
import { getDb } from "../../../db";
import { integrations } from "../../../db/schema";
import { Shell, Heading } from "../../components/shell";
import { saveIntegration } from "../../suite-actions";
import { settings, adminUrl } from "../../telegram";
import {
  Send,
  Camera,
  MessagesSquare,
  BrainCircuit,
  Wallet,
  Link,
} from "lucide-react";
export const dynamic = "force-dynamic";
export default async function Integrations({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireOwner();
  const q = await searchParams,
    rows = await getDb().select().from(integrations);
  const telegramStatus=await ensureTelegramSetup();
  return (
    <Shell admin active="Integrations">
      <Heading
        eyebrow="CONNECTION CENTER"
        title="Bring your tools together."
        description="Manage community destinations and see which services need configuration."
      />
      {q.saved && (
        <div className="notice" role="status">
          Community destination saved.
        </div>
      )}
            <section className="suite-card">
        <h2>Service status</h2><p>Project Assistant bot: <strong>{telegramStatus.ready?"Webhook & profile verified":telegramStatus.state}</strong></p><a href="/workspace/telegram">Connect your own Telegram →</a>
        <p>Everything below works manually until you add the keys. Nothing breaks while a service is on hold.</p>
        <div className="table-scroll">
          <table className="suite-table">
            <thead><tr><th>Service</th><th>Status</th><th>Add these settings later</th></tr></thead>
            <tbody>
              {([
                ["Telegram contact linking & reminders", ["BOT_TOKEN", "TELEGRAM_WEBHOOK_SECRET"], "Until then: tick community verified by hand."],
                ["Daily reminder scheduler", ["REMIND_SECRET", "BOT_TOKEN"], "Until then: use the Send reminders button in Team & targets."],
                ["Bank detail encryption", ["BANK_ENCRYPTION_KEY"], "Required before people save bank details."],
                ["Cashfree payouts", ["CASHFREE_CLIENT_ID", "CASHFREE_CLIENT_SECRET"], "On hold: prepare payouts manually from Payments."],
                ["Discord / WhatsApp automation", ["DISCORD_BOT_TOKEN", "WHATSAPP_TOKEN"], "On hold: share links by hand."],
              ] as [string, string[], string][]).map(([name, keys, note]) => {
                const e = settings() as unknown as Record<string, string | undefined>,
                  ok = keys.every((k) => !!e[k]);
                return (
                  <tr key={name}>
                    <td><strong>{name}</strong></td>
                    <td><span className={"badge" + (ok ? " approved" : "")}>{ok ? "CONNECTED" : "ON HOLD"}</span></td>
                    <td>{ok ? "Ready." : keys.join(", ") + ". " + note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
<section className="suite-card"><p className="eyebrow">TELEGRAM / COMMUNITY OPERATIONS</p><h2>Project spaces, under your control.</h2><p>Announcements are separate from project enrolment. Hindi and Telugu invites require Telegram admin approval. Match join requests to the trained website roster and confirmed Telegram username before admitting them. A Telegram join is not client-work approval.</p><div className="form-grid">{([['Project announcements','COMMUNITY_ADMIN_URL'],['Hindi projects','HINDI_ADMIN_URL'],['Telugu projects','TELUGU_ADMIN_URL']] as const).map(([label,key])=>{const href=adminUrl(settings()[key]);return <div key={key}><strong>{label}</strong><p>{href?<a className="button light" href={href} target="_blank" rel="noreferrer">Manage in Telegram ↗</a>:<span className="badge">Not configured</span>}</p></div>})}</div><p className="small-note">Only the Telegram account owner currently has channel admin rights. Website manager or TL roles do not automatically grant Telegram administration. Keep project invites inside the tutorial-gated flow. No account passwords or bot tokens are stored in source code.</p><a className="text-link" href="/admin/projects/workflow?id=speech-pair">Hindi training & community setup →</a></section>
<div className="integration-grid">
        {[
          [
            "telegram",
            "Telegram",
            "Project announcements and language communities",
            Send,
            "https://t.me/",
          ],
          [
            "discord",
            "Discord",
            "Community discussion and project support",
            MessagesSquare,
            "https://discord.gg/",
          ],
          [
            "instagram",
            "Instagram",
            "Your company’s public Instagram profile",
            Camera,
            "https://www.instagram.com/",
          ],
        ].map(([id, name, desc, Icon, prefix]) => {
          const key = String(id),
            url =
              rows.find((r) => r.id === key)?.url ||
              (key === "telegram" ? settings().COMMUNITY_JOIN_URL : "");
          const Glyph = Icon as typeof Send;
          return (
            <section className="suite-card" key={key}>
              <div className="assignment-top">
                <div className="icon-tile">
                  <Glyph />
                </div>
                <span className="badge">
                  {url ? "LINK CONFIGURED" : "NOT CONFIGURED"}
                </span>
              </div>
              <h2>{String(name)}</h2>
              <p>{String(desc)}</p>
              <form action={saveIntegration}>
                <input name="id" type="hidden" value={key} />
                <label>
                  Community / profile URL
                  <input
                    type="url"
                    name="url"
                    placeholder={String(prefix)}
                    defaultValue={url}
                  />
                </label>
                <button>Save destination</button>
              </form>
              {url && (
                <a className="text-link" href={url}>
                  Open destination
                </a>
              )}
              <small className="integration-note">
                Links appear in the contributor workspace. Automated messaging
                is not connected.
              </small>
            </section>
          );
        })}
        <section className="suite-card">
          <h2>Project CSV import</h2>
          <p>
            Bring real client briefs into your project portfolio. Imported rows
            remain drafts until you publish them.
          </p>
          <a className="button light" href="/admin/import">
            Import projects
          </a>
        </section>
        <section className="suite-card">
          <h2>Client reporting</h2>
          <p>
            Prepare daily section counts, recording totals and your approved
            team roster without a client API.
          </p>
          <a className="button light" href="/admin/team">
            Open team reports
          </a>
        </section>
        <section className="suite-card">
          <h2>Payment administration</h2>
          <p>
            Review securely stored beneficiary details and arrange payments
            through your own bank.
          </p>
          <a className="button light" href="/admin/payments">
            Manage payment details
          </a>
        </section>
      </div>
    </Shell>
  );
}

