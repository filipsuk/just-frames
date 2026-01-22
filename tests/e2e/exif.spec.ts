import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
const JPEG_MARKER_PREFIX = 0xff;
const JPEG_MARKER_SOI = 0xd8;
const JPEG_MARKER_APP1 = 0xe1;
const EXIF_SIGNATURE = Buffer.from([0x45, 0x78, 0x69, 0x66, 0x00, 0x00]);

const buildExifSegment = (payload: Buffer): Buffer => {
  const length = payload.length + EXIF_SIGNATURE.length + 2;
  const header = Buffer.from([
    JPEG_MARKER_PREFIX,
    JPEG_MARKER_APP1,
    (length >> 8) & 0xff,
    length & 0xff,
  ]);
  return Buffer.concat([header, EXIF_SIGNATURE, payload]);
};

const insertExifSegment = (jpeg: Buffer, exifSegment: Buffer): Buffer => {
  if (jpeg[0] !== JPEG_MARKER_PREFIX || jpeg[1] !== JPEG_MARKER_SOI) {
    throw new Error("Expected JPEG buffer to start with SOI marker.");
  }
  return Buffer.concat([jpeg.slice(0, 2), exifSegment, jpeg.slice(2)]);
};

const findExifSegment = (jpeg: Buffer): Buffer | null => {
  if (jpeg[0] !== JPEG_MARKER_PREFIX || jpeg[1] !== JPEG_MARKER_SOI) {
    return null;
  }

  let offset = 2;
  while (offset + 4 <= jpeg.length) {
    if (jpeg[offset] !== JPEG_MARKER_PREFIX) {
      break;
    }

    const marker = jpeg[offset + 1];
    const length = (jpeg[offset + 2] << 8) | jpeg[offset + 3];
    const segmentStart = offset + 4;
    const segmentEnd = segmentStart + length - 2;

    if (segmentEnd > jpeg.length) {
      break;
    }

    if (marker === JPEG_MARKER_APP1) {
      const signature = jpeg.slice(segmentStart, segmentStart + EXIF_SIGNATURE.length);
      if (signature.equals(EXIF_SIGNATURE)) {
        return jpeg.slice(offset, segmentEnd);
      }
    }

    offset = segmentEnd;
  }

  return null;
};

test("preserves EXIF metadata on export", async ({ page }) => {
  await page.goto("/");

  const baseDataUrl = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 10;
    canvas.height = 10;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas context missing");
    }
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.92);
  });

  const baseBuffer = Buffer.from(baseDataUrl.split(",")[1], "base64");
  const exifPayload = Buffer.from("JustFramesExifPayload", "utf8");
  const exifSegment = buildExifSegment(exifPayload);
  const inputBuffer = insertExifSegment(baseBuffer, exifSegment);

  const inputExifSegment = findExifSegment(inputBuffer);
  expect(inputExifSegment?.equals(exifSegment)).toBe(true);

  await page.setInputFiles("#photo-input", {
    name: "exif-sample.jpg",
    mimeType: "image/jpeg",
    buffer: inputBuffer,
  });

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Done" }).click(),
  ]);

  const outputPath = test.info().outputPath("exif-output.jpg");
  await download.saveAs(outputPath);

  const outputBuffer = await fs.readFile(outputPath);
  const outputExifSegment = findExifSegment(outputBuffer);
  expect(outputExifSegment?.equals(exifSegment)).toBe(true);
});
