import type { AspectRatioOption, ImageSize, LayoutResult } from "../shared/types";
import { resolveAspectRatio } from "./aspectRatio";

export interface LayoutInput {
  source: ImageSize;
  borderPercent: number;
  ratio: AspectRatioOption;
}

export const calculateLayout = ({
  source,
  borderPercent,
  ratio,
}: LayoutInput): LayoutResult => {
  const minDimension = Math.min(source.width, source.height);
  const safeBorder = Math.max(
    0,
    Math.round(minDimension * (borderPercent / 100)),
  );
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

export const calculateCanvasScale = (
  layout: LayoutResult,
  maxDimension: number,
): number => {
  if (maxDimension <= 0) {
    return 1;
  }

  const maxLayoutDimension = Math.max(layout.canvasWidth, layout.canvasHeight);
  if (maxLayoutDimension <= maxDimension) {
    return 1;
  }

  return maxDimension / maxLayoutDimension;
};
