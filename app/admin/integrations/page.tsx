import { requireOwner } from "../../access";
import { getDb } from "../../../db";
import { integrations } from "../../../db/schema";
import { Shell, Heading } from "../../components/shell";
import { saveIntegration } from "../../suite-actions";
import { settings } from "../../telegram";
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
        <h2>Service status</h2>
        <p>Everything below works manually until you add the keys. Nothing breaks while a service is on hold.</p>
        <div className="table-scroll">
          <table className="suite-table">
            <thead><tr><th>Service</th><th>Status</th><th>Add these settings later</th></tr></thead>
            <tbody>
              {([
                ["Telegram bot (auto-verify)", ["BOT_TOKEN", "TELEGRAM_WEBHOOK_SECRET"], "Until then: tick community verified by hand."],
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
