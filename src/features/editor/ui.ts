export const createElement = <T extends keyof HTMLElementTagNameMap>(
  tag: T,
  className?: string,
): HTMLElementTagNameMap[T] => {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  return element;
};

export const createCloseButton = (): HTMLButtonElement => {
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
