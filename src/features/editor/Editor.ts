import "./editor.css";
import { calculateLayout } from "../../domain/layout";
import {
  ASPECT_RATIO_LABELS,
  BORDER_PERCENT_MAX,
  BORDER_PERCENT_MIN,
  DEFAULT_BORDER_PERCENT,
  DEFAULT_RATIO,
} from "../../shared/constants";
import type { AspectRatioOption } from "../../shared/types";

interface EditorState {
  image: HTMLImageElement | null;
  borderPercent: number;
  ratio: AspectRatioOption;
  step: "photo" | "ratio" | "preview";
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

  canvas.width = layout.canvasWidth;
  canvas.height = layout.canvasHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, layout.drawX, layout.drawY, image.naturalWidth, image.naturalHeight);
};

const buildRatioOptions = (current: AspectRatioOption): HTMLDivElement => {
  const container = createElement("div", "ratio-options");

  (Object.keys(ASPECT_RATIO_LABELS) as AspectRatioOption[]).forEach((option) => {
    const label = createElement("label");
    const input = createElement("input") as HTMLInputElement;
    input.type = "radio";
    input.name = "ratio";
    input.value = option;
    input.checked = option === current;
    label.append(input, document.createTextNode(` ${ASPECT_RATIO_LABELS[option]}`));
    container.append(label);
  });

  return container;
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
  photoCard.append(photoTitle, photoAction, photoHelper);

  const ratioCard = createElement("section", "card step step-ratio is-hidden");
  const ratioTitle = createElement("h2");
  ratioTitle.textContent = "Pick a frame ratio";
  const ratioOptions = buildRatioOptions(state.ratio);
  const ratioButton = createElement("button") as HTMLButtonElement;
  ratioButton.textContent = "Continue";
  ratioButton.disabled = true;
  ratioCard.append(ratioTitle, ratioOptions, ratioButton);

  const previewCard = createElement("section", "preview step step-preview preview-screen is-hidden");
  const canvas = createElement("canvas") as HTMLCanvasElement;
  const overlay = createElement("div", "preview-overlay");
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
  overlay.append(borderLabel, borderRow, doneButton);
  previewCard.append(canvas, overlay);

  wrapper.append(title, photoCard, ratioCard, previewCard);
  root.append(wrapper);

  const setStep = (step: EditorState["step"]): void => {
    state.step = step;
    photoCard.classList.toggle("is-hidden", step !== "photo");
    ratioCard.classList.toggle("is-hidden", step !== "ratio");
    previewCard.classList.toggle("is-hidden", step !== "preview");
    wrapper.classList.toggle("is-preview", step === "preview");
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

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) {
      return;
    }

    try {
      state.image = await loadImage(file);
      updatePreview();
      ratioButton.disabled = false;
      setStep("ratio");
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
    updatePreview();
  });

  ratioOptions.addEventListener("change", (event) => {
    const target = event.target as HTMLInputElement | null;
    if (!target || target.name !== "ratio") {
      return;
    }

    state.ratio = target.value as AspectRatioOption;
    updatePreview();
  });

  ratioButton.addEventListener("click", () => {
    if (!state.image) {
      return;
    }
    setStep("preview");
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

  updatePreview();
};
