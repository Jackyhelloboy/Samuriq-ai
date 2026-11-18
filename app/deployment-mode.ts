import { env } from "cloudflare:workers";

// Direct hosting uses website passwords, private uploads and in-site support.
// Existing platform-hosted installations retain their separately managed setup.
export function websiteOnly() {
  return (env as unknown as { SAMURIQ_HOSTING_MODE?: string }).SAMURIQ_HOSTING_MODE === "cloudflare";
}

export function publicSiteOrigin() {
  return websiteOnly() ? "https://samuriqai.in" : "https://samuriq-ai-recording-community.thinladle2.chatgpt.site";
}
