import type { AspectRatioOption, ImageSize, LayoutResult } from "../shared/types";
import { resolveAspectRatio } from "./aspectRatio";

export interface LayoutInput {
  source: ImageSize;
  borderWidth: number;
  ratio: AspectRatioOption;
}

export const calculateLayout = ({
  source,
  borderWidth,
  ratio,
}: LayoutInput): LayoutResult => {
  const safeBorder = Math.max(0, Math.floor(borderWidth));
  const baseWidth = source.width + safeBorder * 2;
  const baseHeight = source.height + safeBorder * 2;
  const targetRatio = resolveAspectRatio(ratio, source.width, source.height);

  let canvasWidth = baseWidth;
  let canvasHeight = baseHeight;

  if (ratio !== "original") {
    const baseRatio = baseWidth / baseHeight;
    if (baseRatio > targetRatio) {
      canvasWidth = baseWidth;
      canvasHeight = Math.round(baseWidth / targetRatio);
    } else {
      canvasHeight = baseHeight;
      canvasWidth = Math.round(baseHeight * targetRatio);
    }
  }

  const drawX = Math.round((canvasWidth - source.width) / 2);
  const drawY = Math.round((canvasHeight - source.height) / 2);

  return {
    canvasWidth,
    canvasHeight,
    drawX,
    drawY,
  };
};
