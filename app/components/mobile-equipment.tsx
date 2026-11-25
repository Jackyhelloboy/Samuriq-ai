"use client";

import { useEffect, useState } from "react";

const choices = ["Android", "iOS", "Mac", "Laptops"] as const;
type Device = (typeof choices)[number];
type Detection = { device: Device; os: string; version: string };

export function detectDevice(userAgent: string, platform = "", platformVersion = "", touchPoints = 0): Detection | null {
  const agent = userAgent.toLowerCase();
  const reported = platform.toLowerCase();
  if (/android/.test(agent) || reported === "android") {
    return { device: "Android", os: "Android", version: platformVersion };
  }
  if (/iphone|ipad|ipod/.test(agent) || reported === "ios" || (/macintosh/.test(agent) && touchPoints > 1)) {
    return { device: "iOS", os: "iOS", version: platformVersion || /os\s+([\d_]+)/i.exec(userAgent)?.[1].replaceAll("_", ".") || "" };
  }
  if (/macintosh|mac os x/.test(agent) || reported === "macos") {
    return { device: "Mac", os: "macOS", version: platformVersion };
  }
  if (/windows|linux|cros/.test(agent) || ["windows", "linux", "chrome os"].includes(reported)) {
    const os = /windows/.test(agent) || reported === "windows" ? "Windows" : /cros/.test(agent) ? "Chrome OS" : "Linux";
    // Chromium reports Windows NT 10.0 for both Windows 10 and 11.
    // The platformVersion hint uses 13+ for Windows 11 and 1–10 for Windows 10.
    const windowsVersion = Number.parseInt(platformVersion, 10);
    const version = os === "Windows"
      ? windowsVersion >= 13 ? "11" : windowsVersion >= 1 && windowsVersion <= 10 ? "10" : ""
      : platformVersion;
    return { device: "Laptops", os, version };
  }
  return null;
}

export default function MobileEquipment({ initial, platform, version }: { initial: string; platform: string; version: string }) {
  const [detected, setDetected] = useState<Detection | null>(null);
  const [fallback, setFallback] = useState<Device>(choices.includes(initial as Device) ? initial as Device : "Laptops");
  const [correcting, setCorrecting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const apply = (platformName = "", platformVersion = "") => {
      if (mounted) setDetected(detectDevice(navigator.userAgent, platformName, platformVersion, navigator.maxTouchPoints));
    };
    apply();
    const browser = navigator as Navigator & {
      userAgentData?: { getHighEntropyValues: (keys: string[]) => Promise<{ platform?: string; platformVersion?: string }> };
    };
    browser.userAgentData?.getHighEntropyValues(["platform", "platformVersion"])
      .then(({ platform: name, platformVersion: reportedVersion }) => apply(name, reportedVersion))
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const device = correcting ? fallback : detected?.device || fallback;
  const os = correcting ? (device === "Mac" ? "macOS" : device === "Laptops" ? "" : device)
    : detected?.os || (device === "Mac" ? "macOS" : device === "Laptops" ? "" : device);
  const osVersion = correcting ? (initial === device && platform === os ? version : "")
    : detected ? detected.version : initial === device && platform === os ? version : "";

  return <fieldset className="equipment-fields">
    <legend>Your device</legend>
    {detected && !correcting && <p>Detected {device} · {os}{osVersion ? ` ${osVersion}` : " (version unavailable)"}</p>}
    {(!detected || correcting) && <label>Device
      <select value={fallback} onChange={event => setFallback(event.target.value as Device)}>
        {choices.map(choice => <option key={choice}>{choice}</option>)}
      </select>
    </label>}
    {detected && <button type="button" onClick={() => { setFallback(detected.device); setCorrecting(value => !value); }}>
      {correcting ? "Use detected device" : "Change device"}
    </button>}
    <input type="hidden" name="device" value={device} />
    <input type="hidden" name="mobileOs" value={os} />
    <input type="hidden" name="osVersion" value={osVersion} />
  </fieldset>;
}
