'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {PanelLeftClose,PanelLeftOpen,Menu,X} from 'lucide-react';

export default function WorkspaceChrome({sidebar,header,children,footer,mobileNav}:{
  sidebar:ReactNode;header:ReactNode;children:ReactNode;footer:ReactNode;mobileNav?:ReactNode
}){
  const [collapsed,setCollapsed]=useState(false),[mobile,setMobile]=useState(false);
  const drawer=useRef<HTMLElement>(null),opener=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    try{setCollapsed(localStorage.getItem('samuriq-nav-v6')==='compact')}catch{}
  },[]);
  useEffect(()=>{
    if(!mobile)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    drawer.current?.querySelector<HTMLButtonElement>('.mobile-drawer-close')?.focus();
    const media=window.matchMedia('(min-width: 761px)');
    const closeOnDesktop=()=>{if(media.matches)setMobile(false)};
    function handleKey(e:KeyboardEvent){
      if(e.key==='Escape'){setMobile(false);return;}
      if(e.key!=='Tab')return;
      const controls=Array.from(drawer.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),summary')||[])
        .filter(el=>el.getClientRects().length>0);
      const first=controls[0],last=controls.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
    }
    document.addEventListener('keydown',handleKey);media.addEventListener('change',closeOnDesktop);
    return ()=>{
      document.body.style.overflow=previous;document.removeEventListener('keydown',handleKey);
      media.removeEventListener('change',closeOnDesktop);opener.current?.focus();
    };
  },[mobile]);
  function toggle(){
    setCollapsed(v=>{try{localStorage.setItem('samuriq-nav-v6',!v?'compact':'expanded')}catch{}return !v});
  }
  return <div className={'suite v6-suite v7-suite'+(collapsed?' nav-compact':'')+(mobile?' mobile-nav-open':'')}>
    <a className="skip-to-content" href="#main-content">Skip to workspace content</a>
    <aside ref={drawer} id="workspace-navigation" className="suite-sidebar" role={mobile?'dialog':undefined} aria-modal={mobile||undefined}
      aria-label="Workspace navigation" onClickCapture={e=>{if(mobile&&e.target instanceof Element&&e.target.closest('a[href]'))setMobile(false)}}>
      {mobile&&<button type="button" className="mobile-drawer-close" aria-label="Close workspace menu" onClick={()=>setMobile(false)}><X size={20}/></button>}
      <div className="rail-collapse"><button type="button" onClick={toggle} aria-label={collapsed?'Expand navigation':'Collapse navigation'} aria-expanded={!collapsed}>{collapsed?<PanelLeftOpen size={18}/>:<PanelLeftClose size={18}/>}</button></div>{sidebar}
    </aside>
    {mobile&&<button className="mobile-scrim" tabIndex={-1} aria-label="Close navigation" onClick={()=>setMobile(false)}/>}
    <div className="suite-body" inert={mobile||undefined}>
      <header className="suite-top"><button ref={opener} type="button" className="mobile-nav-toggle" onClick={()=>setMobile(true)} aria-expanded={mobile} aria-controls="workspace-navigation" aria-label="Open navigation"><Menu size={20}/></button>{header}</header>
      <main className="suite-main" id="main-content" tabIndex={-1}>{children}</main>{footer}{mobileNav}
    </div>
  </div>
}
