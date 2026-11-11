export type ProjState = "soon" | "online" | "paused";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
// Online between start day and the deadline day (India time, end of day). Past the deadline the project is paused automatically.
export function projectState(j: { active?: number | boolean; targetStart: string; deadline: string }): ProjState {
  const t = today();
  if(j.active===0||j.active===false)return "paused";
  if (j.deadline && t > j.deadline) return "paused";
  if (j.targetStart && t < j.targetStart) return "soon";
  return "online";
}
export const stateLabel = (s: ProjState) => (s === "online" ? "ACTIVE" : s === "soon" ? "UPCOMING" : "CLOSED");
export function embedUrl(raw: string): string | null {
  try {
    const u = new URL(raw), h = u.hostname.replace(/^www\./, "");
    if (u.protocol !== "https:") return null;
    if (h === "youtu.be") return "https://www.youtube.com/embed/" + u.pathname.slice(1);
    if (h === "youtube.com" || h === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return "https://www.youtube.com/embed/" + v;
      if (u.pathname.startsWith("/embed/") || u.pathname.startsWith("/shorts/")) return "https://www.youtube.com/embed/" + u.pathname.split("/")[2];
    }
    if (h === "drive.google.com") {
      const m = u.pathname.match(/\/file\/d\/([^/]+)/);
      if (m) return "https://drive.google.com/file/d/" + m[1] + "/preview";
    }
    if (h === "vimeo.com" && /^\/\d+/.test(u.pathname)) return "https://player.vimeo.com/video/" + u.pathname.split("/")[1];
  } catch {}
  return null;
}

// Auto-block: after MISS_LIMIT full days without an update, client access is suspended until the person submits a new update.
export const MISS_LIMIT = 2;
const dayNum = (s: string) => Math.floor(new Date(s + "T00:00:00Z").getTime() / 864e5);
export function missedInfo(lastDay: string | null | undefined, since: string, j: { targetStart: string; deadline: string }) {
  const t = today();
  if (projectState(j) !== "online") return { missed: 0, blocked: false };
  const ref = lastDay || (j.targetStart > since.slice(0, 10) ? j.targetStart : since.slice(0, 10));
  const missed = Math.max(0, dayNum(t) - dayNum(ref) - (lastDay ? 1 : 0));
  return { missed, blocked: missed >= MISS_LIMIT };
}

