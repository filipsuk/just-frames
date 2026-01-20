export type AspectRatioOption =
  | "story"
  | "square"
  | "post-vertical"
  | "post-horizontal"
  | "original";

export interface ImageSize {
  width: number;
  height: number;
}

export interface LayoutResult {
  canvasWidth: number;
  canvasHeight: number;
  drawX: number;
  drawY: number;
}
