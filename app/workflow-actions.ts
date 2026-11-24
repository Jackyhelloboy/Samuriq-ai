'use server';

import { websiteOnly } from './deployment-mode';
import { requireOperator } from './access';
import { getDb } from '../db';
import { projects, operationAudit } from '../db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db as recruitmentDb, normalizeGroup } from './recruitment/data';

export async function saveProjectWorkflow(f: FormData) {
  const staff = await requireOperator();
  const db = getDb();
  const id = String(f.get('projectId'));
  const job = await db.select().from(projects).where(eq(projects.id, id)).get();
  if (!job) throw Error('Project unavailable');

  const link = (key: string) => {
    const value = String(f.get(key) || '').trim();
    if (value) {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password || value.length > 2000) {
        throw Error('Use valid HTTPS tutorial links');
      }
    }
    return value;
  };

  let communityUrl = websiteOnly() ? '' : link('communityUrl');
  if (communityUrl) {
    const url = new URL(communityUrl);
    if (url.hostname === 'chat.whatsapp.com') {
      const normalized = normalizeGroup(communityUrl);
      if (!normalized) throw Error('Enter a valid WhatsApp group invite link');
      communityUrl = normalized;
    } else if (!['t.me', 'discord.gg', 'discord.com'].includes(url.hostname)) {
      throw Error('Use an official WhatsApp, Telegram or Discord invitation');
    }
  }

  const introUrl = link('introUrl');
  const tutorialUrl = link('tutorialUrl');
  const registerUrl = link('registerUrl');
  const terms = String(f.get('terms') || '').trim().slice(0, 5000);
  const tutorialSeconds = Number(f.get('tutorialSeconds'));
  const evidenceRequired = f.get('evidenceRequired') === 'yes' ? 1 : 0;

  if (!(tutorialUrl || registerUrl) || terms.length < 20 ||
      !Number.isInteger(tutorialSeconds) || tutorialSeconds < 5 || tutorialSeconds > 14400) {
    throw Error('Add required tutorials, clear terms and a minimum duration from 5 seconds to 4 hours');
  }
  if (evidenceRequired && !job.pair) {
    throw Error('The pair evidence register requires a pair project');
  }

  await db.batch([
    db.update(projects).set({
      communityUrl,
      enrollmentOnly: websiteOnly() ? 0 : communityUrl ? 0 : 1,
      introUrl,
      tutorialUrl,
      registerUrl,
      terms,
      tutorialSeconds,
      evidenceRequired,
      onboardingRequired: 1,
      ...(job.clientUrl.includes('webrtcsg.shenfei-rec.com') ? { inviteCode: 'IMCIAD' } : {}),
    }).where(eq(projects.id, id)),
    db.insert(operationAudit).values({
      id: crypto.randomUUID(),
      actor: staff.user.userId,
      action: 'project-workflow-updated',
      target: id,
      detail: 'Tutorial set and reporting requirements updated. New onboarding acceptance required.',
      created: new Date().toISOString(),
    }),
  ]);

  // Keep the public recruitment-group destination in sync with the workflow invite.
  // Do not erase an existing recruitment invite when the workflow field is left blank.
  if (communityUrl && new URL(communityUrl).hostname === 'chat.whatsapp.com') {
    const revision = crypto.randomUUID();
    await recruitmentDb().batch([
      recruitmentDb().prepare(
        'INSERT OR IGNORE INTO project_recruitment (project_id, languages, devices, group_url, notes, revision) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(id, '', '', communityUrl, '', revision),
      recruitmentDb().prepare(
        'UPDATE project_recruitment SET group_url = ?, revision = ? WHERE project_id = ?'
      ).bind(communityUrl, revision, id),
    ]);
  }

  redirect('/admin/projects/workflow?id=' + encodeURIComponent(id) + '&saved=1');
}
