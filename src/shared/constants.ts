import type { AspectRatioOption } from "./types";

export const ASPECT_RATIO_LABELS: Record<AspectRatioOption, string> = {
  story: "Instagram Story (9:16)",
  square: "Instagram Square (1:1)",
  "post-vertical": "Instagram Post Vertical (4:5)",
  "post-horizontal": "Instagram Post Horizontal (1.91:1)",
  original: "Original",
};

export const ASPECT_RATIOS: Record<Exclude<AspectRatioOption, "original">, number> = {
  story: 9 / 16,
  square: 1,
  "post-vertical": 4 / 5,
  "post-horizontal": 1.91 / 1,
};

export const BORDER_PERCENT_MIN = 0;
export const BORDER_PERCENT_MAX = 20;
export const DEFAULT_BORDER_PERCENT = 8;
export const DEFAULT_RATIO: AspectRatioOption = "story";
