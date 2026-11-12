export function approvedClientOrigin(raw:string){const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||!u.hostname||!/^[a-z0-9.-]+$/i.test(u.hostname))throw Error('Ask the owner to configure a valid HTTPS client destination');return u.origin;}
export function clientFramePermissions(raw:string){const origin=approvedClientOrigin(raw);return 'microphone '+origin+'; camera '+origin+'; fullscreen '+origin;}
export const HINDI_CLIENT_URL='https://webrtcsg.shenfei-rec.com/index';
