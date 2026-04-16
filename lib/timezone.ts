import { useEffect, useState } from "react";

export const DEFAULT_REQUEST_TIME_ZONE = "America/Los_Angeles";
export const DEFAULT_REQUEST_TIME_ZONE_LABEL = "US PT";

const US_TIME_ZONE_LABELS: Record<string, string> = {
  "America/Los_Angeles": "US PT",
  "US/Pacific": "US PT",
  "PST8PDT": "US PT",
  "America/Denver": "US MT",
  "US/Mountain": "US MT",
  "MST7MDT": "US MT",
  "America/Chicago": "US CT",
  "US/Central": "US CT",
  "CST6CDT": "US CT",
  "America/New_York": "US ET",
  "US/Eastern": "US ET",
  EST5EDT: "US ET",
};

function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_REQUEST_TIME_ZONE;
  } catch {
    return DEFAULT_REQUEST_TIME_ZONE;
  }
}

function getIntlTimeZoneLabel(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
      hour: "numeric",
    }).formatToParts(new Date());

    return parts.find((part) => part.type === "timeZoneName")?.value ?? DEFAULT_REQUEST_TIME_ZONE_LABEL;
  } catch {
    return DEFAULT_REQUEST_TIME_ZONE_LABEL;
  }
}

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}

function parseTimestamp(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(trimmed)
    ? trimmed
    : `${trimmed.replace(" ", "T")}Z`;

  const date = new Date(normalized);
  return isValidDate(date) ? date : null;
}

export function getRequestTimeZoneLabel(timeZone: string): string {
  return US_TIME_ZONE_LABELS[timeZone] ?? getIntlTimeZoneLabel(timeZone);
}

export function useRequestTimeZone() {
  const [timeZone, setTimeZone] = useState(DEFAULT_REQUEST_TIME_ZONE);

  useEffect(() => {
    setTimeZone(getBrowserTimeZone());
  }, []);

  return {
    timeZone,
    shortLabel: getRequestTimeZoneLabel(timeZone),
  };
}

export function formatDateTimeParts(iso: string, timeZone: string) {
  const date = parseTimestamp(iso);
  if (!date) {
    return null;
  }

  return {
    date: new Intl.DateTimeFormat("en-US", {
      timeZone,
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date),
    shortLabel: getRequestTimeZoneLabel(timeZone),
  };
}

export function formatDateTimeWithZone(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return "—";

  const parts = formatDateTimeParts(iso, timeZone);
  if (!parts) return "—";

  return `${parts.date}, ${parts.time} ${parts.shortLabel}`;
}

export function formatGenerationDuration(startIso: string | null | undefined, endIso: string | null | undefined): string | null {
  if (!startIso || !endIso) return null;

  const start = parseTimestamp(startIso);
  const end = parseTimestamp(endIso);
  if (!start || !end) return null;

  const totalSeconds = Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }

  return `${Math.max(seconds, 1)}s`;
}