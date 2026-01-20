import "./editor.css";
import { calculateLayout } from "../../domain/layout";
import { ASPECT_RATIO_LABELS, BORDER_WIDTH_MAX, BORDER_WIDTH_MIN, DEFAULT_BORDER_WIDTH, DEFAULT_RATIO } from "../../shared/constants";
import type { AspectRatioOption } from "../../shared/types";

interface EditorState {
  image: HTMLImageElement | null;
  borderWidth: number;
  ratio: AspectRatioOption;
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
  borderWidth: number,
  ratio: AspectRatioOption,
): void => {
  const layout = calculateLayout({
    source: { width: image.naturalWidth, height: image.naturalHeight },
    borderWidth,
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
    borderWidth: DEFAULT_BORDER_WIDTH,
    ratio: DEFAULT_RATIO,
  };

  const wrapper = createElement("div", "editor");
  const title = createElement("h1");
  title.textContent = "Just Frames";

  const controlsCard = createElement("section", "card controls");

  const fileLabel = createElement("label");
  fileLabel.textContent = "Select photo";
  const fileInput = createElement("input") as HTMLInputElement;
  fileInput.type = "file";
  fileInput.accept = "image/*";

  const borderLabel = createElement("label");
  borderLabel.textContent = "Border width";
  const borderRow = createElement("div", "range-row");
  const borderInput = createElement("input") as HTMLInputElement;
  borderInput.type = "range";
  borderInput.min = String(BORDER_WIDTH_MIN);
  borderInput.max = String(BORDER_WIDTH_MAX);
  borderInput.value = String(state.borderWidth);

  const borderValue = createElement("span");
  borderValue.textContent = `${state.borderWidth}px`;
  borderRow.append(borderInput, borderValue);

  const ratioLabel = createElement("label");
  ratioLabel.textContent = "Aspect ratio";
  const ratioOptions = buildRatioOptions(state.ratio);

  const helper = createElement("p", "helper");
  helper.textContent = "Photos never leave your device. Borders are added locally in Safari.";

  controlsCard.append(fileLabel, fileInput, borderLabel, borderRow, ratioLabel, ratioOptions, helper);

  const previewCard = createElement("section", "card preview");
  const canvas = createElement("canvas") as HTMLCanvasElement;
  previewCard.append(canvas);

  const actionCard = createElement("section", "card actions");
  const doneButton = createElement("button") as HTMLButtonElement;
  doneButton.textContent = "Done";
  doneButton.disabled = true;
  actionCard.append(doneButton);

  wrapper.append(title, controlsCard, previewCard, actionCard);
  root.append(wrapper);

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

    renderCanvas(canvas, state.image, state.borderWidth, state.ratio);
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
    } catch (error) {
      console.error(error);
    }
  });

  borderInput.addEventListener("input", () => {
    state.borderWidth = Number(borderInput.value);
    borderValue.textContent = `${state.borderWidth}px`;
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

  doneButton.addEventListener("click", async () => {
    if (!state.image) {
      return;
    }

    const exportCanvas = document.createElement("canvas");
    renderCanvas(exportCanvas, state.image, state.borderWidth, state.ratio);

    const blob = await new Promise<Blob | null>((resolve) =>
      exportCanvas.toBlob(resolve, "image/png"),
    );

    if (!blob) {
      return;
    }

    const file = new File([blob], "just-frame.png", { type: "image/png" });

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
    link.download = "just-frame.png";
    link.click();
    URL.revokeObjectURL(url);
  });

  updatePreview();
};
