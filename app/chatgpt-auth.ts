import {getDb} from "../db";
import {participants} from "../db/schema";
import {eq} from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { sessionUser } from "./account";
import {env} from "cloudflare:workers";

export type ChatGPTUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

const USER_ID_HEADER = "oai-authenticated-user-id";
const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const USER_FULL_NAME_ENCODING_HEADER =
  "oai-authenticated-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";
const SIGN_IN_PATH = "/signin-with-chatgpt";
const SIGN_OUT_PATH = "/signout-with-chatgpt";
const CALLBACK_PATH = "/callback";

async function rawUser(): Promise<ChatGPTUser | null> {
  // An explicit account session always wins over the host browser identity.
  const accountUser = await sessionUser().catch(() => null);
  if (accountUser) return accountUser as ChatGPTUser;
  const jar=await cookies();
  // Never silently become the host owner after expiry, tampering or sign-out.
  if(jar.get("sq_session")?.value||jar.get("sq_auth_signed_out")?.value)return null;
  const requestHeaders = await headers();
  const userId = requestHeaders.get(USER_ID_HEADER);
  const email = requestHeaders.get(USER_EMAIL_HEADER);
  if (!userId || !email) return null;

  const authSettings=env as unknown as {PASSWORD_LOGIN_ONLY?:string;ADMIN_EMAIL?:string};
  // Keep the trusted platform owner recovery and maintenance identity available.
  // All other users must create and use a password account in production.
  if(authSettings.PASSWORD_LOGIN_ONLY==="1" && email.toLowerCase()!==authSettings.ADMIN_EMAIL?.toLowerCase())return null;
  const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
  const fullName =
    encodedFullName &&
    requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
      ? safeDecodeURIComponent(encodedFullName)
      : null;

  return {
    userId,
    displayName: fullName ?? email,
    email,
    fullName,
  };
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `/login?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `/signout?return_to=${encodeURIComponent(safeReturnTo)}`;
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (isReservedAuthPath(url.pathname)) return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

function isReservedAuthPath(pathname: string): boolean {
  return (
    pathname === SIGN_IN_PATH ||
    pathname === SIGN_OUT_PATH ||
    pathname === CALLBACK_PATH
  );
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}


export async function getChatGPTUser():Promise<ChatGPTUser|null>{const user=await rawUser();if(!user)return null;const p=await getDb().select({suspended:participants.suspended}).from(participants).where(eq(participants.id,user.userId)).get();if(p?.suspended)return null;return user;}
