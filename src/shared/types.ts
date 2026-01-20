export type AspectRatioOption =
  | "story"
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
