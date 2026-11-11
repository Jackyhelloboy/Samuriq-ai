import { Brand } from "../marks";
import {
  LayoutDashboard,
  FolderOpen,
  UserRound,
  ChartNoAxesCombined,
  Plug,
  Wallet,
  Radio,
  ArrowUpRight,
  ShieldCheck,
  Settings2,
} from "lucide-react";
import { getChatGPTUser } from "../chatgpt-auth";
import { settings } from "../telegram";
import type { ReactNode } from "react";
export async function Shell({
  children,
  admin = false,
  active = "",
}: {
  children: ReactNode;
  admin?: boolean;
  active?: string;
}) {
  const user = await getChatGPTUser(),
    isOwner =
      user?.email.toLowerCase() === settings().ADMIN_EMAIL?.toLowerCase();
  const links = admin
    ? ([
        ["Overview", "/admin", LayoutDashboard],
        ["Team & targets", "/admin/team", UserRound],
        ["Project roster", "/admin/roster", UserRound],
        ["Projects", "/admin/projects", FolderOpen],
        ["Proof & reports", "/admin/reports", ChartNoAxesCombined],
        ["Integrations", "/admin/integrations", Plug],
        ["Announcements", "/admin/announcements", Radio],
        ["Payments", "/admin/payments", Wallet],
        ["Controls", "/admin/settings", Settings2],
      ] as const)
    : ([
        ["Overview", "/workspace", LayoutDashboard],
        ["Find projects", "/projects", FolderOpen],
        ["My profile", "/workspace?edit=1", UserRound],
        ["Payment details", "/workspace/payments", Wallet],
        ["Daily progress", "/workspace#progress", ChartNoAxesCombined],
      ] as const);
  return (
    <div className="suite">
      <aside className="suite-sidebar">
        <Brand />
        <p className="sidebar-label">
          {admin ? "OPERATIONS CONSOLE" : "CONTRIBUTOR PORTAL"}
        </p>
        <nav aria-label="Workspace navigation">
          {links.map(([name, url, Icon]) => (
            <a
              key={name}
              href={url}
              className={name === active ? "selected" : ""}
            >
              <Icon size={18} />
              {name}
            </a>
          ))}
        </nav>
        <div className="sidebar-note">
          <ShieldCheck size={22} />
          <strong>
            {admin
              ? "Your operations, organized."
              : "A clear path to your next project."}
          </strong>
          <p>
            {admin
              ? "Publish work. Review applications. Follow progress."
              : "Build your profile and apply to opportunities that match your skills."}
          </p>
          <a href="/">
            Company website <ArrowUpRight size={14} />
          </a>
        </div>
      </aside>
      <div className="suite-body">
        <header className="suite-top">
          <span>
            <span className="status-dot" />
            {admin ? "Samuriq AI / Administration" : "Samuriq AI / Workspace"}
          </span>
          <a href={admin ? "/projects" : isOwner ? "/admin" : "/login"}>
            {admin
              ? "View project board"
              : isOwner
                ? "Manage platform"
                : "My account"}{" "}
            <ArrowUpRight size={15} />
          </a>
        </header>
        <main className="suite-main">{children}</main>
        <footer className="suite-foot">
          Samuriq AI · Human intelligence at work{" "}
          <a href="/privacy">Privacy & data</a>
        </footer>
      </div>
    </div>
  );
}
export function Heading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="suite-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="suite-empty">
      <FolderOpen size={30} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Stats({ items }: { items: [string, number | string][] }) {
  return (
    <div className="suite-stats">
      {items.map(([label, value]) => (
        <article key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <small>Workspace activity</small>
        </article>
      ))}
    </div>
  );
}
