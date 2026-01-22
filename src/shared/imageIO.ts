import { extractExifSegment, insertExifSegment } from "./exif";

export const readFileAsDataUrl = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });

export const readFileAsArrayBuffer = (file: Blob): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as ArrayBuffer);
    };
    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.readAsArrayBuffer(file);
  });

export const loadImageWithExif = async (
  file: File,
): Promise<{ image: HTMLImageElement; exifSegment: Uint8Array | null }> => {
  const dataUrl = await readFileAsDataUrl(file);
  const buffer = await readFileAsArrayBuffer(file);
  const exifSegment = extractExifSegment(buffer);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to load image"));
    img.src = dataUrl;
  });

  return { image, exifSegment };
};

export const applyExifToBlob = async (
  blob: Blob,
  exifSegment: Uint8Array | null,
): Promise<Blob> => {
  if (!exifSegment) {
    return blob;
  }

  const buffer = await blob.arrayBuffer();
  const updatedBuffer = insertExifSegment(buffer, exifSegment);
  return new Blob([updatedBuffer], { type: "image/jpeg" });
};
