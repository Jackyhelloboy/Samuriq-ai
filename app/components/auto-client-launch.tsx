'use client';
import {useEffect,useRef} from 'react';
export default function AutoClientLaunch(){const sent=useRef(false);useEffect(()=>{if(sent.current)return;const form=document.querySelector<HTMLFormElement>('form[data-client-launch]');if(!form)return;sent.current=true;const button=form.querySelector<HTMLButtonElement>('button[value="embed"]');if(button)form.requestSubmit(button);},[]);return <p className="client-opening" role="status">Opening your client sign-in inside this page… If it does not appear, tap Load client workspace below.</p>}
