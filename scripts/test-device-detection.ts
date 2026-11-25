import assert from "node:assert/strict";
import { detectDevice } from "../app/components/mobile-equipment";

const windows = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36";
assert.deepEqual(detectDevice(windows, "Windows", "13.0.0"), { device: "Laptops", os: "Windows", version: "11" });
assert.deepEqual(detectDevice(windows, "Windows", "10.0.0"), { device: "Laptops", os: "Windows", version: "10" });
assert.deepEqual(detectDevice(windows), { device: "Laptops", os: "Windows", version: "" });

const android = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/131.0.0.0 Mobile Safari/537.36";
assert.deepEqual(detectDevice(android, "Android", "15.0.0"), { device: "Android", os: "Android", version: "15.0.0" });
assert.deepEqual(detectDevice(android), { device: "Android", os: "Android", version: "" });

const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
assert.deepEqual(detectDevice(iphone), { device: "iOS", os: "iOS", version: "18.4" });

const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36";
assert.deepEqual(detectDevice(mac), { device: "Mac", os: "macOS", version: "" });
assert.deepEqual(detectDevice(mac, "macOS", "15.1.0"), { device: "Mac", os: "macOS", version: "15.1.0" });

console.log("PASS device detection and reduced user agent handling");
