import {
  ASPECT_RATIO_LABELS,
  BORDER_PERCENT_MAX,
  BORDER_PERCENT_MIN,
} from "./constants";
import type { AspectRatioOption } from "./types";

const STORAGE_KEY = "just-frames:preview-settings";

export interface RememberedValues {
  borderPercent: number;
  ratio: AspectRatioOption;
}

const isAspectRatioOption = (value: unknown): value is AspectRatioOption =>
  typeof value === "string" && value in ASPECT_RATIO_LABELS;

const normalizeRememberedValues = (value: unknown): RememberedValues | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const { borderPercent, ratio } = value as Partial<RememberedValues>;

  if (typeof borderPercent !== "number" || !Number.isFinite(borderPercent)) {
    return null;
  }

  if (!isAspectRatioOption(ratio)) {
    return null;
  }

  const clampedBorder = Math.min(
    BORDER_PERCENT_MAX,
    Math.max(BORDER_PERCENT_MIN, borderPercent),
  );

  return { borderPercent: clampedBorder, ratio };
};

export const loadRememberedValues = (): RememberedValues | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return normalizeRememberedValues(JSON.parse(raw));
  } catch {
    return null;
  }
};

export const saveRememberedValues = (values: RememberedValues): void => {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = normalizeRememberedValues(values);
  if (!normalized) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
};
