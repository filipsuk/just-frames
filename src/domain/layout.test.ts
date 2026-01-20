import { describe, expect, it } from "vitest";
import { calculateCanvasScale, calculateLayout } from "./layout";
import { resolveAspectRatio } from "./aspectRatio";
import type { AspectRatioOption } from "../shared/types";

const source = { width: 1200, height: 900 };

describe("resolveAspectRatio", () => {
  it("returns the original ratio when requested", () => {
    expect(resolveAspectRatio("original", 1000, 500)).toBe(2);
  });

  it("returns known ratios for presets", () => {
    expect(resolveAspectRatio("story", 1000, 500)).toBeCloseTo(9 / 16, 5);
    expect(resolveAspectRatio("post-vertical", 1000, 500)).toBeCloseTo(
      4 / 5,
      5,
    );
    expect(resolveAspectRatio("post-horizontal", 1000, 500)).toBeCloseTo(
      1.91,
      5,
    );
  });
});

describe("calculateLayout", () => {
  it("expands the canvas with the requested border", () => {
    const layout = calculateLayout({
      source,
      borderPercent: 10,
      ratio: "original",
    });

    expect(layout.canvasWidth).toBe(1380);
    expect(layout.canvasHeight).toBe(1080);
    expect(layout.drawX).toBe(90);
    expect(layout.drawY).toBe(90);
  });

  it("pads vertically for story ratio", () => {
    const layout = calculateLayout({
      source,
      borderPercent: 12,
      ratio: "story",
    });

    const ratio = layout.canvasWidth / layout.canvasHeight;
    expect(ratio).toBeCloseTo(9 / 16, 2);
    expect(layout.canvasHeight).toBeGreaterThan(source.height + 40);
  });

  it("pads horizontally for wide ratios", () => {
    const layout = calculateLayout({
      source,
      borderPercent: 6,
      ratio: "post-horizontal",
    });

    const ratio = layout.canvasWidth / layout.canvasHeight;
    expect(ratio).toBeCloseTo(1.91, 2);
    expect(layout.canvasWidth).toBeGreaterThan(source.width + 16);
  });
});

describe("calculateCanvasScale", () => {
  it("returns 1 when layout fits within max dimension", () => {
    const layout = calculateLayout({
      source,
      borderPercent: 10,
      ratio: "original",
    });

    expect(calculateCanvasScale(layout, 2000)).toBe(1);
  });

  it("scales down when layout exceeds max dimension", () => {
    const layout = calculateLayout({
      source: { width: 5000, height: 3000 },
      borderPercent: 0,
      ratio: "original",
    });

    expect(calculateCanvasScale(layout, 2500)).toBeCloseTo(0.5, 3);
  });
});

const ratioOptions: AspectRatioOption[] = [
  "story",
  "post-vertical",
  "post-horizontal",
  "original",
];

describe("layout placements", () => {
  it("centers the image for each ratio", () => {
    for (const ratio of ratioOptions) {
      const layout = calculateLayout({
        source,
        borderPercent: 8,
        ratio,
      });

      const left = layout.drawX;
      const right = layout.canvasWidth - layout.drawX - source.width;
      const top = layout.drawY;
      const bottom = layout.canvasHeight - layout.drawY - source.height;

      expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
      expect(Math.abs(top - bottom)).toBeLessThanOrEqual(1);
    }
  });
});
