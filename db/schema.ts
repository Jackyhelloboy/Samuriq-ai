import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
export const participants = sqliteTable("participants", {
  id: text("id").primaryKey(),
  phone:text("phone").notNull().default(""),
  phoneConsent:integer("phone_consent").notNull().default(0),
  suspended:integer("suspended").notNull().default(0),
  name: text("name").notNull(),
  email: text("email").notNull(),
  telegram: text("telegram").notNull(),
  language: text("language").notNull(),
  project: text("project").notNull(),
  source: text("source").notNull().default("direct"),
  skills: text("skills").notNull().default(""),
  location: text("location").notNull().default(""),
  device: text("device").notNull().default(""),
  approved: integer("approved").notNull().default(0),
  created: text("created").notNull(),
});
export const reports = sqliteTable(
  "reports",
  {
    userId: text("user_id").notNull(),
    day: text("day").notNull(),
    status: text("status").notNull(),
    minutes: integer("minutes").notNull(),
    notes: text("notes").notNull(),
    updated: text("updated").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
);
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  requirements: text("requirements").notNull(),
  workType:text("work_type").notNull().default("general"),
  workInstructions:text("work_instructions").notNull().default(""),
  archivedAt:text("archived_at").notNull().default(""),
  externalAllowed:integer("external_allowed").notNull().default(0),
  clientUrl: text("client_url").notNull(),
  inviteCode: text("invite_code").notNull(),
  rate: text("rate").notNull().default("Confirm with coordinator"),
  location: text("location").notNull().default("Remote"),
  questions: text("questions").notNull().default(""),
  targetMinutes: integer("target_minutes").notNull().default(0),
  targetStart: text("target_start").notNull().default(""),
  deadline: text("deadline").notNull().default(""),
  hourlyRate: integer("hourly_rate").notNull().default(0),
  communityUrl: text("community_url").notNull().default(""),
  evidenceRequired: integer("evidence_required").notNull().default(0),
  onboardingRequired: integer("onboarding_required").notNull().default(0),
  tutorialSeconds: integer("tutorial_seconds").notNull().default(60),
  terms: text("terms").notNull().default(""),
  introUrl: text("intro_url").notNull().default(""),
  tutorialUrl: text("tutorial_url").notNull().default(""),
  registerUrl: text("register_url").notNull().default(""),
  visibility:text("visibility").notNull().default("legacy"),
  pair: integer("pair").notNull().default(0),
  active: integer("active").notNull().default(1),
  created: text("created").notNull(),
});
export const applications = sqliteTable(
  "applications",
  {
    userId: text("user_id").notNull(),
    projectId: text("project_id").notNull(),
    partner: text("partner").notNull(),
    partnerEmail: text("partner_email").notNull().default(""),
    partnerConfirmed: integer("partner_confirmed").notNull().default(0),
    communityHandle: text("community_handle").notNull().default(""),
    communityVerified: integer("community_verified").notNull().default(0),
    experience: text("experience").notNull(),
    status: text("status").notNull().default("pending"),
    created: text("created").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.projectId] }),index("applications_partner_email").on(t.partnerEmail)],
);

export const progress = sqliteTable(
  "project_progress",
  {
    userId: text("user_id").notNull(),
    projectId: text("project_id").notNull(),
    day: text("day").notNull(),
    status: text("status").notNull(),
    minutes: integer("minutes").notNull(),
    units: integer("units").notNull(),
    ledgerLocked:integer("ledger_locked").notNull().default(0),
    approvedMinutes: integer("approved_minutes").notNull().default(0),
    notes: text("notes").notNull(),
    proofUrl: text("proof_url").notNull().default(""),
    clientId: text("client_id").notNull().default(""),
    review: text("review").notNull().default("pending"),
    reviewNote: text("review_note").notNull().default(""),
    updated: text("updated").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.projectId, t.day] })],
);
export const notices = sqliteTable("notices", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  created: text("created").notNull(),
});
export const integrations = sqliteTable("integrations", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  updated: text("updated").notNull(),
});

export const launches = sqliteTable("launches", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  projectId: text("project_id").notNull(),
  created: text("created").notNull(),
});
export const bankDetails = sqliteTable("bank_details", {
  userId: text("user_id").primaryKey(),
  encrypted: text("encrypted").notNull(),
  fingerprint:text("fingerprint").notNull().default(""),
  last4: text("last4").notNull(),
  updated: text("updated").notNull(),
});
export const bankAudit = sqliteTable("bank_audit", {
  id: text("id").primaryKey(),
  actor: text("actor").notNull(),
  target: text("target").notNull(),
  action: text("action").notNull(),
  created: text("created").notNull(),
});

export const pairClaims = sqliteTable(
  "pair_claims",
  {
    projectId: text("project_id").notNull(),
    email: text("email").notNull(),
    leadId: text("lead_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.email] })],
);

export const telegramLinks = sqliteTable("telegram_links", {
  handle: text("handle").primaryKey(),
  chatId: text("chat_id").notNull(),
  created: text("created").notNull(),
});

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  salt: text("salt").notNull(),
  hash: text("hash").notNull(),
  created: text("created").notNull(),
});
export const sessions = sqliteTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  accountId: text("account_id").notNull(),
  expires: integer("expires").notNull(),
});

export const managers = sqliteTable("managers", {
  userId: text("user_id").primaryKey(),
  grantedBy: text("granted_by").notNull(),
  created: text("created").notNull(),
});
export const onboarding = sqliteTable(
  "onboarding",
  {
    userId: text("user_id").notNull(),
    projectId: text("project_id").notNull(),
    version: text("version").notNull(),
    requiredSeconds:integer("required_seconds").notNull().default(0),
    watched: integer("watched").notNull().default(0),
    position: integer("position").notNull().default(0),
    lastTick: integer("last_tick").notNull().default(0),
    nonce: text("nonce").notNull(),
    verified: integer("verified").notNull().default(0),
    acceptedAt: text("accepted_at").notNull().default(""),
    clientEmail: text("client_email").notNull().default(""),
    clientUsername: text("client_username").notNull().default(""),
  },
  (t) => [primaryKey({ columns: [t.userId, t.projectId] })],
);
export const clientClaims = sqliteTable(
  "client_claims",
  {
    projectId: text("project_id").notNull(),
    username: text("username").notNull(),
    userId: text("user_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.username] })],
);
export const operationAudit = sqliteTable("operation_audit", {
  id: text("id").primaryKey(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  target: text("target").notNull(),
  detail: text("detail").notNull(),
  created: text("created").notNull(),
});
export const authLimits = sqliteTable("auth_limits", {
  key: text("key").primaryKey(),
  attempts: integer("attempts").notNull(),
  expires: integer("expires").notNull(),
},t=>[index("auth_limit_expiry").on(t.expires)]);

export const identities=sqliteTable("identity_records",{userId:text("user_id").primaryKey(),panHash:text("pan_hash").notNull(),documentHash:text("document_hash").notNull(),encrypted:text("encrypted").notNull(),panLast4:text("pan_last4").notNull(),status:text("status").notNull().default("submitted"),documentKey:text("document_key").notNull(),documentType:text("document_type").notNull(),reviewNote:text("review_note").notNull().default(""),updated:text("updated").notNull()},t=>[uniqueIndex("identity_pan_unique").on(t.panHash),uniqueIndex("identity_document_unique").on(t.documentHash)]);
export const bankClaims=sqliteTable("bank_claims",{fingerprint:text("fingerprint").primaryKey(),ownerId:text("owner_id").notNull(),created:text("created").notNull()});
export const familyGrants=sqliteTable("family_grants",{userId:text("user_id").notNull(),fingerprint:text("fingerprint").notNull(),approvedBy:text("approved_by").notNull(),created:text("created").notNull()},t=>[primaryKey({columns:[t.userId,t.fingerprint]})]);
export const paymentRequests=sqliteTable("payment_requests",{id:text("id").primaryKey(),userId:text("user_id").notNull(),kind:text("kind").notNull(),fingerprint:text("fingerprint").notNull().default(""),last4:text("last4").notNull().default(""),encrypted:text("encrypted").notNull().default(""),reason:text("reason").notNull(),status:text("status").notNull().default("pending"),reviewNote:text("review_note").notNull().default(""),created:text("created").notNull(),reviewed:text("reviewed").notNull().default("")});

export const projectTeams=sqliteTable('project_teams',{id:text('id').primaryKey(),projectId:text('project_id').notNull(),leaderId:text('leader_id').notNull(),label:text('label').notNull(),code:text('code').notNull(),active:integer('active').notNull().default(1),ratePaise:integer('rate_paise').notNull(),approvedRatePaise:integer('approved_rate_paise').notNull(),rateStatus:text('rate_status').notNull().default('approved'),specialExport:integer('special_export').notNull().default(0),createdBy:text('created_by').notNull(),created:text('created').notNull()},t=>[uniqueIndex('team_code_unique').on(t.code),uniqueIndex('team_project_leader_unique').on(t.projectId,t.leaderId)]);
export const teamMembers=sqliteTable('team_members',{projectId:text('project_id').notNull(),userId:text('user_id').notNull(),teamId:text('team_id').notNull(),rateAccepted:integer('rate_accepted').notNull().default(1),ratePaise:integer('rate_paise').notNull(),baseRatePaise:integer('base_rate_paise').notNull(),joined:text('joined').notNull()},t=>[primaryKey({columns:[t.projectId,t.userId]}),index('team_member_user').on(t.userId),index('team_member_team').on(t.teamId)]);
export const leaderReports=sqliteTable('leader_reports',{teamId:text('team_id').notNull(),day:text('day').notNull(),actor:text('actor').notNull(),summary:text('summary').notNull(),blockers:text('blockers').notNull(),nextSteps:text('next_steps').notNull(),memberCount:integer('member_count').notNull(),reportedCount:integer('reported_count').notNull(),updated:text('updated').notNull()},t=>[primaryKey({columns:[t.teamId,t.day]})]);
export const supportTickets=sqliteTable('support_tickets',{privateEscalation:integer('private_escalation').notNull().default(0),id:text('id').primaryKey(),projectId:text('project_id').notNull(),teamId:text('team_id').notNull(),requesterId:text('requester_id').notNull(),subject:text('subject').notNull(),body:text('body').notNull(),status:text('status').notNull().default('open'),resolution:text('resolution').notNull().default(''),deadline:text('deadline').notNull().default(''),closedAt:text('closed_at').notNull().default(''),route:text('route').notNull().default('team'),created:text('created').notNull(),updated:text('updated').notNull()});
export const ticketMessages=sqliteTable('ticket_messages',{id:text('id').primaryKey(),ticketId:text('ticket_id').notNull(),actor:text('actor').notNull(),role:text('role').notNull(),body:text('body').notNull(),created:text('created').notNull()});
export const earnings=sqliteTable('earnings',{id:text('id').primaryKey(),sourceUserId:text('source_user_id').notNull(),projectId:text('project_id').notNull(),day:text('day').notNull(),userId:text('user_id').notNull(),kind:text('kind').notNull(),teamId:text('team_id').notNull().default(''),minutes:integer('minutes').notNull(),ratePaise:integer('rate_paise').notNull(),amountPaise:integer('amount_paise').notNull(),sourceVersion:text('source_version').notNull(),created:text('created').notNull()},t=>[uniqueIndex('earning_source_unique').on(t.sourceUserId,t.projectId,t.day,t.userId,t.kind)]);
export const payoutOrders=sqliteTable('payout_orders',{id:text('id').primaryKey(),earningId:text('earning_id').notNull(),userId:text('user_id').notNull(),amountPaise:integer('amount_paise').notNull(),bankSnapshot:text('bank_snapshot').notNull(),bankLast4:text('bank_last4').notNull(),status:text('status').notNull().default('prepared'),mode:text('mode').notNull().default('manual'),providerRef:text('provider_ref').notNull().default(''),note:text('note').notNull().default(''),createdBy:text('created_by').notNull(),created:text('created').notNull(),updated:text('updated').notNull()},t=>[uniqueIndex('payout_earning_unique').on(t.earningId)]);
export const projectExpenses=sqliteTable('project_expenses',{id:text('id').primaryKey(),projectId:text('project_id').notNull(),title:text('title').notNull(),category:text('category').notNull(),amountPaise:integer('amount_paise').notNull(),day:text('day').notNull(),reference:text('reference').notNull().default(''),status:text('status').notNull().default('recorded'),createdBy:text('created_by').notNull(),created:text('created').notNull()});

export const evidenceFolders=sqliteTable('evidence_folders',{projectId:text('project_id').notNull(),userId:text('user_id').notNull(),leadId:text('lead_id').notNull(),url:text('url').notNull(),verifiedBy:text('verified_by').notNull().default(''),updated:text('updated').notNull()},t=>[primaryKey({columns:[t.projectId,t.userId]}),uniqueIndex('project_folder_unique').on(t.projectId,t.url)]);
export const pairReviews=sqliteTable('pair_reviews',{projectId:text('project_id').notNull(),leadId:text('lead_id').notNull(),day:text('day').notNull(),teamId:text('team_id').notNull(),pairId:text('pair_id').notNull(),sections:integer('sections').notNull(),minutes:integer('minutes').notNull(),firstUrl:text('first_url').notNull().default(''),secondUrl:text('second_url').notNull().default(''),firstShots:integer('first_shots').notNull(),secondShots:integer('second_shots').notNull(),sectionIds:text('section_ids').notNull(),attendance:text('attendance').notNull(),feedback:text('feedback').notNull(),actor:text('actor').notNull(),updated:text('updated').notNull()},t=>[primaryKey({columns:[t.projectId,t.leadId,t.day]})]);
export const teamHelpers=sqliteTable('team_helpers',{teamId:text('team_id').notNull(),userId:text('user_id').notNull(),scopes:text('scopes').notNull(),grantedBy:text('granted_by').notNull(),created:text('created').notNull()},t=>[primaryKey({columns:[t.teamId,t.userId]})]);

export const launchTickets=sqliteTable('launch_tickets',{hash:text('hash').primaryKey(),userId:text('user_id').notNull(),projectId:text('project_id').notNull(),expires:integer('expires').notNull(),used:integer('used').notNull().default(0)},t=>[index('launch_ticket_expiry').on(t.expires)]);

export const projectPermissions=sqliteTable('project_permissions',{teamId:text('team_id').notNull(),userId:text('user_id').notNull(),projectId:text('project_id').notNull(),status:text('status').notNull().default('pending'),reason:text('reason').notNull(),actor:text('actor').notNull().default(''),updated:text('updated').notNull()},t=>[primaryKey({columns:[t.teamId,t.userId,t.projectId]}),index('project_permission_user').on(t.userId,t.projectId)]);
