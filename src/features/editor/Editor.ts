import "./editor.css";
import { calculateCanvasScale, calculateLayout } from "../../domain/layout";
import {
  ASPECT_RATIO_LABELS,
  BORDER_PERCENT_MAX,
  BORDER_PERCENT_MIN,
  DEFAULT_BORDER_PERCENT,
  DEFAULT_RATIO,
  MAX_CANVAS_DIMENSION,
} from "../../shared/constants";
import { applyExifToBlob, loadImageWithExif } from "../../shared/imageIO";
import { createRafThrottled } from "../../shared/rafThrottle";
import {
  loadRememberedValues,
  saveRememberedValues,
} from "../../shared/rememberedValues";
import type { AspectRatioOption } from "../../shared/types";
import { createCloseButton, createElement } from "./ui";

interface EditorState {
  image: HTMLImageElement | null;
  exifSegment: Uint8Array | null;
  borderPercent: number;
  ratio: AspectRatioOption;
  step: "photo" | "preview";
}

const renderCanvas = (
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  borderPercent: number,
  ratio: AspectRatioOption,
): void => {
  const layout = calculateLayout({
    source: { width: image.naturalWidth, height: image.naturalHeight },
    borderPercent,
    ratio,
  });
  const scale = calculateCanvasScale(layout, MAX_CANVAS_DIMENSION);
  const canvasWidth = Math.max(1, Math.round(layout.canvasWidth * scale));
  const canvasHeight = Math.max(1, Math.round(layout.canvasHeight * scale));

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    image,
    layout.drawX * scale,
    layout.drawY * scale,
    image.naturalWidth * scale,
    image.naturalHeight * scale,
  );
};

const isMobileDevice = (): boolean => {
  if (navigator.userAgentData?.mobile !== undefined) {
    return navigator.userAgentData.mobile;
  }

  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

export const createEditor = (root: HTMLElement): void => {
  const rememberedValues = loadRememberedValues();
  const state: EditorState = {
    image: null,
    exifSegment: null,
    borderPercent: rememberedValues?.borderPercent ?? DEFAULT_BORDER_PERCENT,
    ratio: rememberedValues?.ratio ?? DEFAULT_RATIO,
    step: "photo",
  };

  const wrapper = createElement("div", "editor");
  const title = createElement("h1");
  title.textContent = "Just Frames";
  const intro = createElement("p", "intro");
  intro.textContent =
    "Add a white frame to your photo. Works offline and your photos never leave your device.";

  const photoCard = createElement("section", "step step-photo");
  const fileInput = createElement("input") as HTMLInputElement;
  fileInput.id = "photo-input";
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.className = "photo-input";
  const photoButton = createElement("button") as HTMLButtonElement;
  photoButton.type = "button";
  photoButton.className = "button-primary";
  photoButton.textContent = "Select photo";
  const valueList = createElement("ul", "value-list");
  [
    "Privacy-first (no uploads)",
    "Works offline + add to Home Screen",
    "High quality export",
    "Preserves EXIF metadata",
    "No watermarks",
    "Free & open-source",
  ].forEach((value) => {
    const item = createElement("li");
    item.textContent = value;
    valueList.append(item);
  });
  photoCard.append(photoButton, fileInput, valueList);

  const previewCard = createElement("section", "preview step step-preview preview-screen is-hidden");
  const closeButton = createCloseButton();
  const canvas = createElement("canvas") as HTMLCanvasElement;
  const previewStage = createElement("div", "preview-stage");
  const previewControls = createElement("div", "preview-controls");
  const borderLabel = createElement("label");
  borderLabel.textContent = "Border";
  const borderRow = createElement("div", "range-row");
  const borderInput = createElement("input") as HTMLInputElement;
  borderInput.id = "border-range";
  borderInput.type = "range";
  borderInput.min = String(BORDER_PERCENT_MIN);
  borderInput.max = String(BORDER_PERCENT_MAX);
  borderInput.value = String(state.borderPercent);
  borderLabel.htmlFor = borderInput.id;
  const borderValue = createElement("span");
  borderValue.textContent = `${state.borderPercent}%`;
  borderRow.append(borderInput, borderValue);

  const ratioRow = createElement("div", "ratio-row");
  const ratioLabel = createElement("label");
  ratioLabel.textContent = "Frame ratio";
  const ratioSelect = createElement("select") as HTMLSelectElement;
  ratioSelect.id = "ratio-select";
  ratioSelect.className = "ratio-select";
  ratioLabel.htmlFor = ratioSelect.id;
  (Object.keys(ASPECT_RATIO_LABELS) as AspectRatioOption[]).forEach((option) => {
    const optionElement = createElement("option") as HTMLOptionElement;
    optionElement.value = option;
    optionElement.textContent = ASPECT_RATIO_LABELS[option];
    optionElement.selected = option === state.ratio;
    ratioSelect.append(optionElement);
  });
  ratioRow.append(ratioLabel, ratioSelect);

  const doneButton = createElement("button") as HTMLButtonElement;
  doneButton.className = "button-primary";
  doneButton.textContent = "Done";
  doneButton.disabled = true;
  previewStage.append(canvas);
  previewControls.append(borderLabel, borderRow, ratioRow, doneButton);
  previewCard.append(closeButton, previewStage, previewControls);

  wrapper.append(title, intro, photoCard, previewCard);
  root.append(wrapper);

  const setStep = (step: EditorState["step"]): void => {
    state.step = step;
    photoCard.classList.toggle("is-hidden", step !== "photo");
    previewCard.classList.toggle("is-hidden", step !== "preview");
    wrapper.classList.toggle("is-wizard", step !== "photo");
    wrapper.classList.toggle("is-preview", step === "preview");
    root.classList.toggle("is-wizard", step !== "photo");
    root.classList.toggle("is-preview", step === "preview");
    document.body.classList.toggle("is-wizard", step !== "photo");
    document.body.classList.toggle("is-preview", step === "preview");
  };

  const updatePreview = (): void => {
    if (!state.image) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = 600;
        canvas.height = 400;
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#64748b";
        ctx.font = "16px sans-serif";
        ctx.fillText("Select a photo to preview", 20, 40);
      }
      doneButton.disabled = true;
      return;
    }

    renderCanvas(canvas, state.image, state.borderPercent, state.ratio);
    doneButton.disabled = false;
  };

  const resetAfterExport = (): void => {
    state.image = null;
    state.exifSegment = null;
    fileInput.value = "";
    updatePreview();
    setStep("photo");
  };

  const schedulePreview = createRafThrottled(() => {
    updatePreview();
  });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) {
      return;
    }

    try {
      const result = await loadImageWithExif(file);
      state.image = result.image;
      state.exifSegment = result.exifSegment;
      updatePreview();
      setStep("preview");
    } catch (error) {
      console.error(error);
    }
  });

  photoButton.addEventListener("click", () => {
    fileInput.click();
  });

  borderInput.addEventListener("input", () => {
    state.borderPercent = Number(borderInput.value);
    borderValue.textContent = `${state.borderPercent}%`;
    saveRememberedValues({
      borderPercent: state.borderPercent,
      ratio: state.ratio,
    });
    schedulePreview();
  });

  ratioSelect.addEventListener("change", () => {
    state.ratio = ratioSelect.value as AspectRatioOption;
    saveRememberedValues({
      borderPercent: state.borderPercent,
      ratio: state.ratio,
    });
    updatePreview();
  });

  doneButton.addEventListener("click", async () => {
    if (!state.image) {
      return;
    }

    const exportCanvas = document.createElement("canvas");
    renderCanvas(exportCanvas, state.image, state.borderPercent, state.ratio);

    const blob = await new Promise<Blob | null>((resolve) =>
      exportCanvas.toBlob(resolve, "image/jpeg", 0.92),
    );

    if (!blob) {
      return;
    }

    const exportBlob = await applyExifToBlob(blob, state.exifSegment);
    const file = new File([exportBlob], "just-frame.jpg", { type: "image/jpeg" });

    if (isMobileDevice() && navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Just Frames",
        });
        resetAfterExport();
      } catch (error) {
        console.error(error);
      }
      return;
    }

    const url = URL.createObjectURL(exportBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "just-frame.jpg";
    try {
      link.click();
    } finally {
      URL.revokeObjectURL(url);
    }
    resetAfterExport();
  });

  closeButton.addEventListener("click", () => {
    state.image = null;
    fileInput.value = "";
    updatePreview();
    setStep("photo");
  });

  updatePreview();
};
