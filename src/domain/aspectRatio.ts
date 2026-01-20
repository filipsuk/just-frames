import type { AspectRatioOption } from "../shared/types";
import { ASPECT_RATIOS } from "../shared/constants";

export const resolveAspectRatio = (
  option: AspectRatioOption,
  sourceWidth: number,
  sourceHeight: number,
): number => {
  if (option === "original") {
    if (sourceHeight === 0) {
      return 1;
    }
    return sourceWidth / sourceHeight;
  }

  return ASPECT_RATIOS[option];
};
