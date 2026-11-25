import { websiteOnly } from "../deployment-mode";
import { switchWorkspace } from '../workspace-view-actions';
import { PolicyNotice } from './policy-notice';
import { WorkspaceNotices } from './workspace-notices';
import { Brand } from '../marks';
import { workspaceAccess } from '../workspace-context';
import WorkspaceChrome from './workspace-chrome';
import { LayoutDashboard,FolderOpen,UserRound,ChartNoAxesCombined,Plug,Wallet,Radio,ArrowUpRight,ShieldCheck,Settings2,BookOpen,PenLine,Users,ChevronDown,Boxes,Bell } from 'lucide-react';
import type { ReactNode } from 'react';
export async function Shell({children,admin=false,active="",workspace}:{children:ReactNode;admin?:boolean;active?:string;workspace?:"manager"}){
const {user,staff,leader,helper}=await workspaceAccess();
const area=!user?'Project opportunities':active==='Helper workspace'?'Helper workspace':admin?(staff?.role==='owner'&&workspace!=='manager'?'Admin workspace':'Manager workspace'):(active==='Team workspace'?(leader?'Team leader workspace':'Delegated team workspace'):'Contributor workspace');
const roleHome=active==='Helper workspace'?'/helper':admin?(staff?.role==='owner'&&workspace!=='manager'?'/admin/dashboard':'/manager'):(active==='Team workspace'?'/teams':'/workspace');
const choices=[...(staff?.role==='owner'?[['Admin workspace','/admin/dashboard','Projects, people & payments']]:[]),...(staff?[['Manager workspace','/manager','Projects, teams & delivery']]:[]),...(leader?[['Team leader workspace','/teams','Your members and support']]:[]),...(helper?[['Helper workspace','/helper','Your delegated team tasks']]:[]),['Contributor workspace','/workspace','Projects, payments & support']];
const operational=[['Recruitment','/admin/recruitment',Users],['Team transfers','/admin/transfers',Users],['Vendors & assignments','/admin/vendors',Users],['Dashboard',roleHome,LayoutDashboard],['Applications','/admin',UserRound],['Team leaders','/admin/leaders',Users],['Support desk','/support',BookOpen],['Evidence register','/teams/evidence',ShieldCheck],['Contacts','/admin/contacts',UserRound],['Project roster','/admin/roster',Users],['Team & targets','/admin/team',ChartNoAxesCombined],['Proof & reports','/admin/reports',ShieldCheck],['Onboarding','/admin/onboarding',BookOpen],['Projects','/admin/projects',FolderOpen]] as const;
const finance=[['Payments','/admin/payments',Wallet],['Payout ledger','/admin/payouts',Wallet],['Expenses','/admin/expenses',ChartNoAxesCombined],['Bank requests','/admin/identity',ShieldCheck]] as const;
const control=[['WhatsApp audience','/admin/audience',Users],['Staff invitations','/admin/invitations',Users],['Policies & agreements','/admin/policies',ShieldCheck],['Project workflows','/admin/workflows',Boxes],['People & roles','/admin/people',Users],['Announcements','/admin/announcements',Radio],['Content studio','/admin/content',PenLine],['Controls','/admin/settings',Settings2],['Security','/admin/security',ShieldCheck],['Integrations','/admin/integrations',Plug]] as const;
const personal=[['Use an invitation','/join',Users],['Overview','/workspace',LayoutDashboard],['Find projects','/projects',FolderOpen],['My profile','/workspace?edit=1',UserRound],['Hiring preferences','/workspace/hiring',Settings2],...(!websiteOnly()?[['Join project group','/workspace/telegram',Radio] as const]:[]),['Payment details','/workspace/payments',Wallet],...(leader?[['Team workspace','/teams',Users] as const]:[]),['Support desk','/support',BookOpen]] as const;
const leaderLinks=[['Team workspace','/teams',Users],['Payment details','/workspace/payments',Wallet],['Evidence register','/teams/evidence',ShieldCheck],['Support desk','/support',BookOpen],...(helper?[['Helper workspace','/helper',Users]]:[]),['Contributor workspace','/workspace',UserRound]] as const;
const core=[['Dashboard',roleHome,LayoutDashboard],['Projects','/admin/projects',FolderOpen],['Vendors & assignments','/admin/vendors',Users],['Applications','/admin',UserRound],['Project roster','/admin/roster',Users],['Support desk','/support',BookOpen]] as const;
const more=operational.filter(([,url])=>!core.some(([,coreUrl])=>coreUrl===url));
const sections=active==='Helper workspace'?[['DELEGATED WORK',[['Helper workspace','/helper',LayoutDashboard],['Assigned queries','/support',BookOpen],['Contributor workspace','/workspace',UserRound]]]]:admin?[['WORKSPACE',core],['PROJECT OPERATIONS',more],...(staff?.role==='owner'&&workspace!=='manager'?[['PAYMENTS',finance],['ADMINISTRATION',control]]:[])]:active==='Team workspace'&&leader?[['TEAM OPERATIONS',leaderLinks]]:[['MY WORKSPACE',personal]];

const guestLinks=[['Find projects','/projects',FolderOpen],['Locations & languages','/india',Users],['Support','/support',BookOpen]] as const;
const sidebar=!user?<><Brand/><nav aria-label="Public navigation"><section className="nav-section"><h2 className="nav-section-label">OPPORTUNITIES</h2>{guestLinks.map(([name,url,Icon])=><a key={url} href={url} className={name===active?'selected':''} aria-current={name===active?'page':undefined}><Icon size={18}/><span className="nav-link-label">{name}</span></a>)}</section></nav><div className="rail-tools"><a href="/"><ArrowUpRight size={17}/><span>About Samuriq AI</span></a></div><a className="guest-rail-signin" href="/login#create-account">Create an account</a></>:<><Brand/><p className="sidebar-label">SAMURIQ AI / WORKSPACE</p><nav aria-label="Workspace navigation">{sections.map(([label,links])=><section className="nav-section" key={String(label)}><h2 className="nav-section-label">{String(label)}</h2>{(links as typeof operational).map(([name,url,Icon])=><a key={url} title={name} href={url} className={name===active||(name==='Dashboard'&&active==='Dashboard')?'selected':''} aria-current={name===active?'page':undefined}><Icon size={18}/><span className="nav-link-label">{name}</span></a>)}</section>)}</nav><div className="rail-tools"><a href="/"><ArrowUpRight size={17}/><span>Company & project board</span></a></div></>;
const header=<>{user?(choices.length>1?<details className="workspace-switcher"><summary aria-label={`Current workspace: ${area}. Switch workspace`}><span className="workspace-symbol"><Boxes size={18}/></span><strong>{area}</strong><ChevronDown size={15}/></summary><div className="workspace-options">{choices.map(([label,url])=>{const role=url==='/admin/dashboard'?'owner':url==='/manager'?'manager':url==='/teams'?'tl':url==='/helper'?'helper':'contributor';return <form action={switchWorkspace} key={label}><input type="hidden" name="workspace" value={role}/><button className="workspace-choice" aria-current={area===label?'page':undefined}><strong>{label}</strong></button></form>})}</div></details>:<div className="workspace-current"><span className="workspace-symbol"><Boxes size={18}/></span><strong>{area}</strong></div>):<a className="guest-top-brand" href="/">Samuriq AI <span> / Project opportunities</span></a>}<div className="top-quick-links"><a className="top-projects" href="/projects"><FolderOpen size={16}/><span>Project board</span></a>{user?<><a href="/notifications" aria-label="Open notifications" title="Notifications"><Bell size={18}/></a><details className="account-menu"><summary><span className="account-avatar">{user.displayName?.charAt(0).toUpperCase()||'U'}</span><span>{user.displayName?.split(' ')[0]?.split('@')[0]}</span><ChevronDown size={13}/></summary><div><a href="/workspace?edit=1">My profile</a><a href="/workspace/payments">Payment details</a><a href="/agreements">My agreements</a><a href="/signout">Sign out</a></div></details></>:<a className="guest-top-signin" href="/login">Sign in</a>}</div></>;
const mobileItems=admin?[['Home',roleHome,LayoutDashboard],['People','/admin/roster',Users],['Projects','/admin/projects',FolderOpen],['Help','/support',BookOpen]]:area==='Team leader workspace'||area==='Delegated team workspace'?[['Team','/teams',Users],['Projects','/projects',FolderOpen],['Help','/support',BookOpen]]:area==='Helper workspace'?[['Tasks','/helper',LayoutDashboard],['Help','/support',BookOpen]]:[['My work','/workspace',LayoutDashboard],['Projects','/projects',FolderOpen],['Payments','/workspace/payments',Wallet],['Help','/support',BookOpen]];
return <WorkspaceChrome guest={!user} mobileNav={<nav className="phone-bottom-nav" aria-label="Quick navigation">{((user?mobileItems:[['Projects','/projects',FolderOpen],['Locations','/india',Users],['Support','/support',BookOpen],['Sign in','/login',UserRound]]) as [string,string,typeof LayoutDashboard][]).map(([label,url,Icon])=><a key={url} href={url}><Icon size={20}/><span>{label}</span></a>)}</nav>} sidebar={sidebar} header={header} footer={<footer className="suite-foot"><span>Samuriq AI <span className="footer-divider">/</span> {area}</span><div><a href="/india">Locations & languages</a><a href="/privacy">Privacy & data</a><a href="/support">Support</a></div></footer>}>{user&&active!=='Find projects'&&<PolicyNotice/>}{user&&['Overview','Dashboard'].includes(active)&&<WorkspaceNotices/>}{children}{user&&active==='Find projects'&&<PolicyNotice/>}</WorkspaceChrome>;
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
