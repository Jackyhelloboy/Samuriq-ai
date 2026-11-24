"use client";

import { useEffect, useState } from "react";

const choices = ["Android", "iOS", "Mac", "Laptops"] as const;
type Device = (typeof choices)[number];
type Detection = { device: Device; os: string; version: string; source: "browser hints" | "browser user agent" };

function detectDevice(userAgent: string, platform = "", platformVersion = "", touchPoints = 0): Detection | null {
  const agent = userAgent.toLowerCase();
  const reported = platform.toLowerCase();
  const source = platformVersion || platform ? "browser hints" : "browser user agent";

  if (/android/.test(agent) || reported === "android") {
    return { device: "Android", os: "Android", version: platformVersion || /android\s+([\d.]+)/i.exec(userAgent)?.[1] || "", source };
  }
  if (/iphone|ipad|ipod/.test(agent) || reported === "ios" || (/macintosh/.test(agent) && touchPoints > 1)) {
    const iosVersion = /os\s+([\d_]+)/i.exec(userAgent)?.[1]?.replaceAll("_", ".");
    return { device: "iOS", os: "iOS", version: platformVersion || iosVersion || "", source };
  }
  if (/macintosh|mac os x/.test(agent) || reported === "macos") {
    const macVersion = /mac os x\s+([\d_.]+)/i.exec(userAgent)?.[1]?.replaceAll("_", ".");
    return { device: "Mac", os: "macOS", version: platformVersion || macVersion || "", source };
  }
  if (/windows/.test(agent) || reported === "windows") {
    // Chromium's high-entropy platformVersion distinguishes Windows 11 (13+) from Windows 10.
    // The legacy Windows NT 10.0 user-agent is shared by Windows 10 and 11, so never guess from it.
    const major = Number(platformVersion.split(".")[0]);
    const os = platformVersion ? (major >= 13 ? "Windows 11" : "Windows 10") : "Windows";
    const legacyVersion = /windows nt\s+([\d.]+)/i.exec(userAgent)?.[1] || "";
    return { device: "Laptops", os, version: platformVersion || (legacyVersion === "10.0" ? "" : legacyVersion), source };
  }
  if (/cros/.test(agent) || reported === "chrome os") {
    const chromeVersion = /cros [^ ]+ ([\d.]+)/i.exec(userAgent)?.[1] || "";
    return { device: "Laptops", os: "Chrome OS", version: platformVersion || chromeVersion, source };
  }
  if (/linux/.test(agent) || reported === "linux") {
    return { device: "Laptops", os: "Linux", version: platformVersion, source };
  }
  return null;
}

export default function MobileEquipment({ initial, platform, version }: { initial: string; platform: string; version: string }) {
  const [detected, setDetected] = useState<Detection | null>(null);
  const [fallback, setFallback] = useState<Device>(choices.includes(initial as Device) ? initial as Device : "Laptops");

  useEffect(() => {
    let mounted = true;
    const apply = (platformName = "", platformVersion = "") => {
      if (mounted) setDetected(detectDevice(navigator.userAgent, platformName, platformVersion, navigator.maxTouchPoints));
    };
    apply();
    const browser = navigator as Navigator & {
      userAgentData?: {
        getHighEntropyValues: (keys: string[]) => Promise<{ platform?: string; platformVersion?: string }>;
      };
    };
    browser.userAgentData?.getHighEntropyValues(["platform", "platformVersion"])
      .then(({ platform: name, platformVersion: reportedVersion }) => apply(name, reportedVersion))
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const device = detected?.device || fallback;
  const os = detected?.os || (device === "Mac" ? "macOS" : device === "Laptops" ? "" : device);
  const osVersion = detected?.version || (initial === device && platform === os ? version : "");
  const description = detected
    ? `Detected ${device === "Laptops" ? "computer" : device} · ${os || "Operating system"}${osVersion ? ` ${osVersion}` : " · version not exposed by this browser"}`
    : "Automatic detection is unavailable in this browser. Choose your device.";

  return <fieldset className="equipment-fields">
    <legend>Your device</legend>
    <p role="status" aria-live="polite">{description}</p>
    {!detected && <label>Device
      <select value={fallback} onChange={event => setFallback(event.target.value as Device)}>
        {choices.map(choice => <option key={choice}>{choice}</option>)}
      </select>
    </label>}
    <input type="hidden" name="device" value={device} />
    <input type="hidden" name="mobileOs" value={os} />
    <input type="hidden" name="osVersion" value={osVersion} />
  </fieldset>;
}
