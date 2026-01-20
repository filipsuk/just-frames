import type { LayoutResult } from "../shared/types";

export const ensureMinimumBorder = (
  layout: LayoutResult,
  borderPixels: number,
): boolean => {
  const safeBorder = Math.max(0, Math.floor(borderPixels));
  const minX = Math.min(layout.drawX, layout.canvasWidth - layout.drawX);
  const minY = Math.min(layout.drawY, layout.canvasHeight - layout.drawY);

  return minX >= safeBorder && minY >= safeBorder;
};
