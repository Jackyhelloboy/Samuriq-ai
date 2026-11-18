import {publicSiteOrigin} from '../deployment-mode';
export function GET(){const origin=publicSiteOrigin();return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>'+origin+'/</loc></url><url><loc>'+origin+'/projects</loc></url></urlset>',{headers:{'Content-Type':'application/xml','Cache-Control':'public, max-age=3600'}})}
