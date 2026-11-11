import { getDb } from "../db";
import { integrations } from "../db/schema";
export const featureDefinitions = [
  ["preview_projects","Layout preview projects","Show clearly marked, closed sample cards. They never accept applications."],
  [
    "applications",
    "New applications",
    "Allow contributors to apply to published projects.",
  ],
  [
    "reporting",
    "Daily reporting",
    "Allow approved pair leads to submit daily updates.",
  ],
  [
    "bank",
    "Bank onboarding",
    "Allow contributors to add or update payment details.",
  ],
  [
    "client_access",
    "Client workspace access",
    "Allow approved contributors to launch external workspaces.",
  ],
  [
    "community",
    "Community links",
    "Display community destinations to contributors.",
  ],
  [
    "announcements",
    "Announcements",
    "Display published announcements in contributor workspaces.",
  ],
] as const;
export async function features() {
  const rows = await getDb().select().from(integrations);
  return Object.fromEntries(
    featureDefinitions.map(([key]) => [
      key,
      rows.find((r) => r.id === "feature:" + key)?.url !== "0",
    ]),
  ) as Record<string, boolean>;
}
export async function requireFeature(key: string) {
  if (!(await features())[key])
    throw Error(
      "This feature is temporarily paused by the project coordinator.",
    );
}
