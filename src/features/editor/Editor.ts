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
import { createRafThrottled } from "../../shared/rafThrottle";
import type { AspectRatioOption } from "../../shared/types";

interface EditorState {
  image: HTMLImageElement | null;
  borderPercent: number;
  ratio: AspectRatioOption;
  step: "photo" | "preview";
}

const createElement = <T extends keyof HTMLElementTagNameMap>(
  tag: T,
  className?: string,
): HTMLElementTagNameMap[T] => {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  return element;
};

const createCloseButton = (): HTMLButtonElement => {
  const button = createElement("button", "preview-close") as HTMLButtonElement;
  button.type = "button";
  button.setAttribute("aria-label", "Close preview");

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("aria-hidden", "true");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M6 6l12 12M18 6l-12 12");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");

  svg.append(path);
  button.append(svg);
  return button;
};

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Unable to load image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });

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

export const createEditor = (root: HTMLElement): void => {
  const state: EditorState = {
    image: null,
    borderPercent: DEFAULT_BORDER_PERCENT,
    ratio: DEFAULT_RATIO,
    step: "photo",
  };

  const wrapper = createElement("div", "editor");
  const title = createElement("h1");
  title.textContent = "Just Frames";

  const photoCard = createElement("section", "card step step-photo");
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
  const photoTitle = createElement("h2");
  photoTitle.textContent = "Choose a photo";
  const fileInput = createElement("input") as HTMLInputElement;
  fileInput.id = "photo-input";
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.className = "photo-input";
  const photoAction = createElement("div", "photo-action");
  const photoButton = createElement("button") as HTMLButtonElement;
  photoButton.type = "button";
  photoButton.textContent = "Select photo";
  photoAction.append(photoButton, fileInput);
  const photoHelper = createElement("p", "helper");
  photoHelper.textContent = "Your photo stays on your device.";
  photoCard.append(ratioRow, photoTitle, photoAction, photoHelper);

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

  const doneButton = createElement("button") as HTMLButtonElement;
  doneButton.textContent = "Done";
  doneButton.disabled = true;
  previewStage.append(canvas);
  previewControls.append(borderLabel, borderRow, doneButton);
  previewCard.append(closeButton, previewStage, previewControls);

  wrapper.append(title, photoCard, previewCard);
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

  const schedulePreview = createRafThrottled(() => {
    updatePreview();
  });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) {
      return;
    }

    try {
      state.image = await loadImage(file);
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
    schedulePreview();
  });

  ratioSelect.addEventListener("change", () => {
    state.ratio = ratioSelect.value as AspectRatioOption;
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

    const file = new File([blob], "just-frame.jpg", { type: "image/jpeg" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: "Just Frames",
      });
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "just-frame.jpg";
    link.click();
    URL.revokeObjectURL(url);
  });

  closeButton.addEventListener("click", () => {
    setStep("photo");
  });

  updatePreview();
};
