'use client';

import { useMemo, useState } from 'react';
import { INDIA_STATES } from '../india-states';
import { INDIA_LANGUAGES } from '../india-languages';

export default function ProfilePreferences({ language = '', location = '' }: { language?: string; location?: string }) {
  const initialState = useMemo(() => {
    const parts = location.split(',').map(part => part.trim()).filter(Boolean);
    if (parts.at(-1)?.toLowerCase() === 'india') parts.pop();
    return INDIA_STATES.find(state => state.name.toLowerCase() === parts.at(-1)?.toLowerCase())?.code || '';
  }, [location]);
  const [selected, setSelected] = useState(() => language.split(',').map(value => value.trim()).filter(Boolean));
  const [filter, setFilter] = useState('');
  const [other, setOther] = useState('');
  const [stateCode, setStateCode] = useState(initialState);
  const [locationEdited, setLocationEdited] = useState(false);
  const state = INDIA_STATES.find(item => item.code === stateCode);
  const value = location && !locationEdited ? location : state ? `${state.name}, India` : '';
  const additional = other.split(',').map(value => value.trim()).filter(Boolean);
  const languages = [...new Set([...selected, ...additional])].join(', ');
  function toggle(name: string) {
    setSelected(current => current.includes(name) ? current.filter(value => value !== name) : [...current, name]);
  }

  return <div className="profile-preferences">
    <fieldset>
      <legend>Languages you speak</legend>
      <p className="small-note">Select every language you can use comfortably. Project eligibility follows each client’s brief.</p>
      <input type="hidden" name="language" value={languages} />
      <input aria-label="Search languages" type="search" value={filter} onChange={event => setFilter(event.target.value)} placeholder="Search Indian languages…" />
      <div className="language-choices">{INDIA_LANGUAGES.filter(name => name.toLowerCase().includes(filter.toLowerCase())).map(name =>
        <label className="language-option" key={name}><input type="checkbox" checked={selected.includes(name)} onChange={() => toggle(name)} />{name}</label>
      )}</div>
      <div className="selected-languages" aria-live="polite">{selected.map(name =>
        <button type="button" key={name} onClick={() => toggle(name)} aria-label={'Remove ' + name}>{name} ×</button>
      )}</div>
      <label>Other languages or dialects<input value={other} onChange={event => setOther(event.target.value.slice(0, 250))} maxLength={250} placeholder="Separate additional languages with commas" /></label>
    </fieldset>
    <fieldset>
      <legend>State where you work</legend>
      <input type="hidden" name="location" value={value} />
      <label>State / union territory
        <select name="indiaState" value={stateCode} onChange={event => { setLocationEdited(true); setStateCode(event.target.value); }} required={!location}>
          <option value="">Select state / union territory</option>
          {INDIA_STATES.map(item => <option value={item.code} key={item.code}>{item.name}</option>)}
        </select>
      </label>
    </fieldset>
  </div>;
}
