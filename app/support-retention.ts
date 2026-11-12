import {env} from 'cloudflare:workers';
/** Deletes support content only. Open/overdue tickets and delivery/financial records are never purged. */
export async function purgeClosedSupport(){const db=env.DB;if(!db)throw Error('Database unavailable');const cutoff=new Date(Date.now()-7*86400000).toISOString();const result=await db.batch([
 db.prepare("UPDATE operation_audit SET detail='Closed support content removed under seven-day retention' WHERE target IN (SELECT id FROM support_tickets WHERE status='closed' AND closed_at<>'' AND closed_at<=?) AND action LIKE 'ticket-%'").bind(cutoff),
 db.prepare("DELETE FROM ticket_messages WHERE ticket_id IN (SELECT id FROM support_tickets WHERE status='closed' AND closed_at<>'' AND closed_at<=?)").bind(cutoff),
 db.prepare("DELETE FROM support_tickets WHERE status='closed' AND closed_at<>'' AND closed_at<=?").bind(cutoff)
]);return {deletedTickets:result[2].meta.changes||0,cutoff};}
