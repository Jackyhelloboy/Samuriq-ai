import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
export const participants = sqliteTable("participants", {
  id: text("id").primaryKey(),
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
  (t) => [primaryKey({ columns: [t.userId, t.projectId] })],
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
});

export const identities=sqliteTable("identity_records",{userId:text("user_id").primaryKey(),panHash:text("pan_hash").notNull(),documentHash:text("document_hash").notNull(),encrypted:text("encrypted").notNull(),panLast4:text("pan_last4").notNull(),status:text("status").notNull().default("submitted"),documentKey:text("document_key").notNull(),documentType:text("document_type").notNull(),reviewNote:text("review_note").notNull().default(""),updated:text("updated").notNull()},t=>[uniqueIndex("identity_pan_unique").on(t.panHash),uniqueIndex("identity_document_unique").on(t.documentHash)]);
export const bankClaims=sqliteTable("bank_claims",{fingerprint:text("fingerprint").primaryKey(),ownerId:text("owner_id").notNull(),created:text("created").notNull()});
export const familyGrants=sqliteTable("family_grants",{userId:text("user_id").notNull(),fingerprint:text("fingerprint").notNull(),approvedBy:text("approved_by").notNull(),created:text("created").notNull()},t=>[primaryKey({columns:[t.userId,t.fingerprint]})]);
export const paymentRequests=sqliteTable("payment_requests",{id:text("id").primaryKey(),userId:text("user_id").notNull(),kind:text("kind").notNull(),fingerprint:text("fingerprint").notNull().default(""),last4:text("last4").notNull().default(""),encrypted:text("encrypted").notNull().default(""),reason:text("reason").notNull(),status:text("status").notNull().default("pending"),reviewNote:text("review_note").notNull().default(""),created:text("created").notNull(),reviewed:text("reviewed").notNull().default("")});
