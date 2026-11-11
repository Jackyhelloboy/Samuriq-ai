import { Brand } from "../marks";
import { staffRole } from "../access";
import { getChatGPTUser } from "../chatgpt-auth";
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
  BookOpen,
  PenLine,
} from "lucide-react";
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
  const staff = await staffRole(),
    user = await getChatGPTUser();
  const all = admin
    ? ([
        ["Overview", "/admin", LayoutDashboard],
        ["Onboarding", "/admin/onboarding", BookOpen],
        ["People & roles", "/admin/people", UserRound],
        ["Content studio", "/admin/content", PenLine],
        ["Team & targets", "/admin/team", ChartNoAxesCombined],
        ["Project roster", "/admin/roster", UserRound],
        ["Projects", "/admin/projects", FolderOpen],
        ["Proof & reports", "/admin/reports", ShieldCheck],
        ["Announcements", "/admin/announcements", Radio],
        ["Payments", "/admin/payments", Wallet],
        ["Controls", "/admin/settings", Settings2],
        ["Security", "/admin/security", ShieldCheck],
        ["Integrations", "/admin/integrations", Plug],
      ] as const)
    : ([
        ["Overview", "/workspace", LayoutDashboard],
        ["Find projects", "/projects", FolderOpen],
        ["My profile", "/workspace?edit=1", UserRound],
        ["Payment details", "/workspace/payments", Wallet],
        ["Daily progress", "/workspace#progress", ChartNoAxesCombined],
      ] as const);
  const managerRoutes = [
    "/admin",
    "/admin/team",
    "/admin/roster",
    "/admin/reports",
    "/admin/onboarding",
  ];
  const links =
    admin && staff?.role === "manager"
      ? all.filter((l) => managerRoutes.includes(l[1]))
      : all;
  return (
    <div className="suite">
      <aside className="suite-sidebar">
        <Brand />
        <p className="sidebar-label">
          {admin
            ? staff?.role === "owner"
              ? "OWNER CONSOLE"
              : "TEAM OPERATIONS"
            : "CONTRIBUTOR WORKSPACE"}
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
            {admin ? "People. Projects. Progress." : "Your work, connected."}
          </strong>
          <p>
            {admin
              ? "Clear approvals and daily team visibility."
              : "Choose a project, complete onboarding and stay in touch with your team."}
          </p>
          <a href="/">
            Company & project board <ArrowUpRight size={14} />
          </a>
        </div>
      </aside>
      <div className="suite-body">
        <header className="suite-top">
          <span>
            <span className="status-dot" />
            Samuriq AI /{" "}
            {admin
              ? staff?.role === "owner"
                ? "Owner"
                : "Manager"
              : "Workspace"}
          </span>
          <div className="actions">
            {user && <span>{user.displayName.split(" ")[0]}</span>}
            <a href={admin ? "/projects" : staff ? "/admin" : "/login"}>
              {admin
                ? "Project board"
                : staff
                  ? "Manage platform"
                  : "My account"}{" "}
              <ArrowUpRight size={14} />
            </a>
            {user && <a href="/signout">Sign out</a>}
          </div>
        </header>
        <main className="suite-main">{children}</main>
        <footer className="suite-foot">
          <span>Samuriq AI · Human data. Real possibility.</span>
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
          <small>Current workspace data</small>
        </article>
      ))}
    </div>
  );
}
