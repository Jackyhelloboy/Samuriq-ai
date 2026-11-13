import {switchWorkspace} from '../workspace-view-actions';
import {PolicyNotice} from './policy-notice';
import {WorkspaceNotices} from './workspace-notices';
import {Brand} from '../marks';
import {workspaceAccess} from '../workspace-context';
import WorkspaceChrome from './workspace-chrome';
import {LayoutDashboard,FolderOpen,UserRound,ChartNoAxesCombined,Plug,Wallet,Radio,ArrowUpRight,ShieldCheck,Settings2,BookOpen,PenLine,Users,ChevronDown,Boxes,Bell,FlaskConical} from 'lucide-react';
import type {ReactNode} from 'react';
export async function Shell({children,admin=false,active="",workspace}:{children:ReactNode;admin?:boolean;active?:string;workspace?:"manager"}){
const {user,staff,leader,helper}=await workspaceAccess();
const area=active==='Helper workspace'?'Helper workspace':admin?(staff?.role==='owner'&&workspace!=='manager'?'Owner console':'Manager workspace'):(active==='Team workspace'?(leader?'Team leader workspace':'Delegated team workspace'):'Contributor workspace');
const roleHome=active==='Helper workspace'?'/helper':admin?(staff?.role==='owner'&&workspace!=='manager'?'/admin/dashboard':'/manager'):(active==='Team workspace'?'/teams':'/workspace');
const choices=[...(staff?.role==='owner'?[['Owner console','/admin/dashboard','Platform, finance & permissions']]:[]),...(staff?[['Manager workspace','/manager','Projects, teams & daily delivery'],['TL supervision','/teams','View assigned team workspaces']]:leader?[['Team leader workspace','/teams','Your members, tickets & daily reports']]:[]),...(helper?[['Helper workspace','/helper','Your delegated team tasks']]:[]),['Contributor workspace','/workspace','Your projects, evidence & support']];
const operational=[['Team transfers','/admin/transfers',Users],['Vendors & assignments','/admin/vendors',Users],['Dashboard',roleHome,LayoutDashboard],['Applications','/admin',UserRound],['Team leaders','/admin/leaders',Users],['Support desk','/support',BookOpen],['Evidence register','/teams/evidence',ShieldCheck],['Contacts','/admin/contacts',UserRound],['Project roster','/admin/roster',Users],['Team & targets','/admin/team',ChartNoAxesCombined],['Proof & reports','/admin/reports',ShieldCheck],['Onboarding','/admin/onboarding',BookOpen],['Projects','/admin/projects',FolderOpen]] as const;
const finance=[['Payments','/admin/payments',Wallet],['Payout ledger','/admin/payouts',Wallet],['Expenses','/admin/expenses',ChartNoAxesCombined],['Bank requests','/admin/identity',ShieldCheck]] as const;
const control=[['Policies & agreements','/admin/policies',ShieldCheck],['Project workflows','/admin/workflows',Boxes],['People & roles','/admin/people',Users],['Announcements','/admin/announcements',Radio],['Content studio','/admin/content',PenLine],['Controls','/admin/settings',Settings2],['Security','/admin/security',ShieldCheck],['Integrations','/admin/integrations',Plug]] as const;
const personal=[['Overview','/workspace',LayoutDashboard],['Find projects','/projects',FolderOpen],['Client workspace','/workspace/client',Boxes],['My profile','/workspace?edit=1',UserRound],['Connect Telegram','/workspace/telegram',Radio],['Evidence & attendance','/workspace/evidence',ShieldCheck],['Add Payments','/workspace/payments',Wallet],...(leader?[['Team workspace','/teams',Users] as const]:[]),['Support desk','/support',BookOpen],['Daily progress','/workspace#progress',ChartNoAxesCombined]] as const;
const leaderLinks=[['Team workspace','/teams',Users],['Add Payments','/workspace/payments',Wallet],['Evidence register','/teams/evidence',ShieldCheck],['Support desk','/support',BookOpen],...(helper?[['Helper workspace','/helper',Users]]:[]),['Contributor workspace','/workspace',UserRound]] as const;
const sections=active==='Helper workspace'?[['DELEGATED WORK',[['Helper workspace','/helper',LayoutDashboard],['Assigned queries','/support',BookOpen],['Contributor workspace','/workspace',UserRound]]]]:admin?[['OPERATIONS',operational],...(staff?.role==='owner'&&workspace!=='manager'?[['FINANCE',finance],['PLATFORM',control]]:[])]:active==='Team workspace'&&leader?[['TEAM OPERATIONS',leaderLinks]]:[['MY WORKSPACE',personal]];
const sidebar=<><Brand/><p className="sidebar-label">WORKSPACE / SAMURIQ AI</p><nav aria-label="Workspace navigation">{sections.map(([label,links])=><details className="nav-section" open key={String(label)}><summary>{String(label)}<ChevronDown size={12}/></summary>{(links as typeof operational).map(([name,url,Icon])=><a key={url} title={name} href={url} className={name===active||(name==='Dashboard'&&active==='Dashboard')?'selected':''} aria-current={name===active?'page':undefined}><Icon size={18}/><span className="nav-link-label">{name}</span></a>)}</details>)}</nav><div className="rail-tools"><a href="/"><ArrowUpRight size={17}/><span>Company & project board</span></a></div><div className="sidebar-note"><span className="status-dot"/><strong>Structured work. Clear ownership.</strong><p>Projects, people and daily delivery.</p></div></>;
const header=<><details className="workspace-switcher"><summary><span className="workspace-symbol"><Boxes size={18}/></span><span><small>SAMURIQ AI</small><strong>{area}</strong></span><ChevronDown size={15}/></summary><div className="workspace-options"><p>SWITCH WORKSPACE</p>{choices.map(([label,url,description])=>{const role=url==='/admin/dashboard'?'owner':url==='/manager'?'manager':url==='/teams'?(leader?'tl':'manager'):url==='/helper'?'helper':'contributor';return <form action={switchWorkspace} key={label}><input type="hidden" name="workspace" value={role}/><button className="workspace-choice"><strong>{label}</strong><small>{description}</small></button></form>})}</div></details><div className="top-quick-links"><a className="top-projects" href="/projects"><FolderOpen size={16}/><span>Project board</span></a><a href="/notifications" aria-label="Open notifications" title="Notifications"><Bell size={18}/></a><details className="account-menu"><summary><span className="account-avatar">{user?.displayName?.charAt(0).toUpperCase()||'G'}</span><span>{user?.displayName?.split(' ')[0]?.split('@')[0]||'Guest'}</span><ChevronDown size={13}/></summary><div><a href="/workspace?edit=1">My profile</a><a href="/workspace/payments">Add Payments</a><a href="/agreements">My agreements</a><a href={user?'/signout':'/login'}>{user?'Sign out':'Sign in'}</a></div></details></div></>;
return <WorkspaceChrome sidebar={sidebar} header={header} footer={<footer className="suite-foot"><span>Samuriq AI <span className="footer-divider">/</span> {area}</span><div><span className="v6-release">V12</span><a href="/india">Locations & languages</a><a href="/privacy">Privacy & data</a><a href="/support">Support</a></div></footer>}>{user&&<PolicyNotice/>}{user&&<WorkspaceNotices/>}{children}</WorkspaceChrome>;
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
