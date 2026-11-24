'use client';
import {useMemo,useState} from 'react';
import {INDIA_STATES} from '../india-states';
import {INDIA_LANGUAGES} from '../india-languages';

export default function ProfilePreferences({language='',location=''}:{language?:string;location?:string}){
 const initial=useMemo(()=>{const bits=location.split(',').map(s=>s.trim()).filter(Boolean);if(bits.at(-1)?.toLowerCase()==='india')bits.pop();const found=INDIA_STATES.find(s=>s.name.toLowerCase()===bits.at(-1)?.toLowerCase());return found?.code||''},[location]);
 const [stateCode,setStateCode]=useState(initial);
 const [selected,setSelected]=useState(()=>language.split(',').map(s=>s.trim()).filter(Boolean));
 const [filter,setFilter]=useState('');
 const [other,setOther]=useState('');
 const toggle=(name:string)=>setSelected(old=>old.includes(name)?old.filter(x=>x!==name):[...old,name]);
 const stateName=INDIA_STATES.find(s=>s.code===stateCode)?.name||'';
 const languages=[...new Set([...selected,...other.split(',').map(s=>s.trim()).filter(Boolean)])].join(', ');
 return <div className="profile-preferences">
  <fieldset><legend>Languages you speak</legend>
   <p className="small-note">Choose the languages you can comfortably use for project work.</p>
   <input type="hidden" name="language" value={languages}/>
   <input aria-label="Search languages" type="search" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search languages…"/>
   <div className="language-choices">{INDIA_LANGUAGES.filter(l=>l.toLowerCase().includes(filter.toLowerCase())).map(name=><label className="language-option" key={name}><input type="checkbox" checked={selected.includes(name)} onChange={()=>toggle(name)}/>{name}</label>)}</div>
   <div className="selected-languages" aria-live="polite">{selected.map(name=><button type="button" key={name} onClick={()=>toggle(name)} aria-label={'Remove '+name}>{name} ×</button>)}</div>
   <label>Other languages<input value={other} onChange={e=>setOther(e.target.value.slice(0,250))} maxLength={250} placeholder="Separate with commas"/></label>
  </fieldset>
  <fieldset><legend>Location</legend>
   <p className="small-note">Select your state or union territory. No village, town or street address is required.</p>
   <input type="hidden" name="location" value={stateName}/>
   <label>State / union territory<select name="indiaState" required value={stateCode} onChange={e=>setStateCode(e.target.value)}><option value="">Select state / union territory</option>{INDIA_STATES.map(s=><option value={s.code} key={s.code}>{s.name}</option>)}</select></label>
  </fieldset>
 </div>;
}
