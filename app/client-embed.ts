import {publicHttpsUrl} from "./frame-policy";
export function approvedClientOrigin(raw:string){const u=publicHttpsUrl(raw);return u.origin;}
export function clientFramePermissions(raw:string){const origin=approvedClientOrigin(raw);return 'microphone '+origin+'; camera '+origin+'; fullscreen '+origin;}
export const HINDI_CLIENT_URL='https://webrtcsg.shenfei-rec.com/index';
