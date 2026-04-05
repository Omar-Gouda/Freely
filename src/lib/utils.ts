import { clsx } from "clsx";

export function cn(...classes: Array<string | false | null | undefined>) {
  return clsx(classes);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "--";
  }

  return `${Number(value).toFixed(1)} / 10`;
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function normalizeOptionalUrl(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function clampTenPointScore(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }

  const normalized = value > 10 ? value / 10 : value;
  return Math.max(0, Math.min(10, Math.round(normalized * 10) / 10));
}
