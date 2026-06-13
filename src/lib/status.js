// Shared status metadata, result parsing, and small display helpers.
import { COUNTRIES } from "../data/countries";

export const STATUS_META = {
  "Visa-Free":       { type: "free",     color: "green",  emoji: "✅" },
  "eVisa Available": { type: "evisa",    color: "blue",   emoji: "🔵" },
  "Visa on Arrival": { type: "arrival",  color: "orange", emoji: "🟡" },
  "Visa Required":   { type: "required", color: "red",    emoji: "❌" },
  "Entry Banned":    { type: "banned",   color: "black",  emoji: "🚫" },
};

export const SECTION_KEYS = [
  "VISA STATUS",
  "VISA TYPE",
  "PROCESSING TIME",
  "WHERE TO APPLY",
  "REQUIRED DOCUMENTS",
  "DISCLAIMER",
];

export function parseResult(text) {
  const parsed = {};
  const parts = text.split(/\*\*\s*([A-Z][A-Z\s]{2,}?)\s*\*\*\s*:?\s*/);
  for (let i = 1; i < parts.length - 1; i += 2) {
    const key = parts[i].trim().toUpperCase();
    const content = (parts[i + 1] || "").trim();
    if (SECTION_KEYS.includes(key)) {
      parsed[key] = content || null;
    }
  }
  return parsed;
}

export function getStatusConfig(text) {
  if (!text) return { type: "unknown", label: "Check Details", color: "gray" };
  const lower = text.toLowerCase();
  const firstLine = lower.split("\n")[0];
  if (firstLine.includes("entry banned") || firstLine.includes("banned") || firstLine.includes("prohibited") || firstLine.includes("not permitted")) {
    return { type: "banned", label: "Entry Banned", color: "black" };
  }
  if (firstLine.includes("visa-free") || firstLine.includes("visa free") || firstLine.includes("no visa")) {
    return { type: "free", label: "Visa-Free", color: "green" };
  }
  if (firstLine.includes("evisa available") || firstLine.includes("e-visa available")) {
    return { type: "evisa", label: "eVisa Available", color: "blue" };
  }
  if (firstLine.includes("visa on arrival")) {
    return { type: "arrival", label: "Visa on Arrival", color: "orange" };
  }
  if (firstLine.includes("visa required") || firstLine.includes("required")) {
    return { type: "required", label: "Visa Required", color: "red" };
  }
  return { type: "unknown", label: "Check Details", color: "gray" };
}

/** Status label → config, for places that store the label directly. */
export function configForLabel(label) {
  const meta = STATUS_META[label];
  if (!meta) return { type: "unknown", label: label || "Check Details", color: "gray" };
  return { type: meta.type, label, color: meta.color };
}

import { regionOfCode } from "../data/regions";

const NAME_TO_CODE = new Map(COUNTRIES.map((c) => [c.name, c.code]));

export function regionOf(name) {
  const code = NAME_TO_CODE.get(name);
  return code ? regionOfCode(code) : null;
}

export function flag(name) {
  const code = NAME_TO_CODE.get(name);
  if (!code) return "🌍";
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

export function timeAgo(ts) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(ts).toLocaleDateString();
}

export function stripMd(text) {
  return text.replace(/\*\*/g, "").replace(/\*/g, "").trim();
}

/** Turn a section's text into clean list items. */
export function parseLines(text) {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => stripMd(line).replace(/^\d+\.\s*/, "").replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);
}
