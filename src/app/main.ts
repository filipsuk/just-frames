import { createEditor } from "../features/editor/Editor";

const root = document.getElementById("app");

if (root) {
  createEditor(root);
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/just-frames/sw.js");
  });
}
