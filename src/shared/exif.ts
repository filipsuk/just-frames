const JPEG_MARKER_PREFIX = 0xff;
const JPEG_MARKER_SOI = 0xd8;
const JPEG_MARKER_EOI = 0xd9;
const JPEG_MARKER_SOS = 0xda;
const JPEG_MARKER_APP1 = 0xe1;
const EXIF_SIGNATURE = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00];

const isExifSegment = (bytes: Uint8Array, offset: number): boolean =>
  EXIF_SIGNATURE.every((byte, index) => bytes[offset + index] === byte);

const readUint16 = (bytes: Uint8Array, offset: number): number =>
  (bytes[offset] << 8) | bytes[offset + 1];

export const extractExifSegment = (buffer: ArrayBuffer): Uint8Array | null => {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 4 || bytes[0] !== JPEG_MARKER_PREFIX || bytes[1] !== JPEG_MARKER_SOI) {
    return null;
  }

  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== JPEG_MARKER_PREFIX) {
      break;
    }

    const marker = bytes[offset + 1];
    if (marker === JPEG_MARKER_EOI || marker === JPEG_MARKER_SOS) {
      break;
    }

    const segmentLength = readUint16(bytes, offset + 2);
    const segmentStart = offset + 4;
    const segmentEnd = segmentStart + segmentLength - 2;
    if (segmentEnd > bytes.length) {
      break;
    }

    if (marker === JPEG_MARKER_APP1 && isExifSegment(bytes, segmentStart)) {
      return bytes.slice(offset, segmentEnd);
    }

    offset = segmentEnd;
  }

  return null;
};

export const insertExifSegment = (
  buffer: ArrayBuffer,
  exifSegment: Uint8Array | null,
): ArrayBuffer => {
  if (!exifSegment || exifSegment.length === 0) {
    return buffer;
  }

  const bytes = new Uint8Array(buffer);
  if (bytes.length < 2 || bytes[0] !== JPEG_MARKER_PREFIX || bytes[1] !== JPEG_MARKER_SOI) {
    return buffer;
  }

  const output = new Uint8Array(bytes.length + exifSegment.length);
  output.set(bytes.slice(0, 2), 0);
  output.set(exifSegment, 2);
  output.set(bytes.slice(2), 2 + exifSegment.length);
  return output.buffer;
};
