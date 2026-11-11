import { env } from "cloudflare:workers";

type CommunityEnv = {
  HINDI_JOIN_URL?: string;
  TELUGU_JOIN_URL?: string;
  COMMUNITY_JOIN_URL?: string;
  ADMIN_EMAIL?: string;
  HINDI_ADMIN_URL?: string;
  TELUGU_ADMIN_URL?: string;
  COMMUNITY_ADMIN_URL?: string;
};

export function settings(): CommunityEnv {
  return env as CommunityEnv;
}

export function joinUrl(value?: string) {
  return value && /^https:\/\/t\.me\/\+[A-Za-z0-9_-]+$/.test(value) ? value : null;
}

export function adminUrl(value?: string) {
  return value && /^https:\/\/web\.telegram\.org\/a\/#-\d+$/.test(value) ? value : null;
}
