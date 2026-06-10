import { canvasToDataUrl } from "./capture.js";

export function createGallery() {
  let captures = [];

  return {
    add(canvas) {
      const item = {
        id: createId(),
        canvas,
        createdAt: new Date(),
        thumbnail: canvasToDataUrl(canvas, "png")
      };

      captures = [item, ...captures];
      return item;
    },
    remove(id) {
      captures = captures.filter((item) => item.id !== id);
    },
    all() {
      return captures;
    },
    find(id) {
      return captures.find((item) => item.id === id);
    }
  };
}

export function renderGallery(container, captures, handlers) {
  container.innerHTML = "";

  captures.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "gallery-card";

    const thumbButton = document.createElement("button");
    thumbButton.className = "gallery-thumb";
    thumbButton.type = "button";
    thumbButton.setAttribute("aria-label", `Tampilkan foto ${captures.length - index}`);
    thumbButton.addEventListener("click", () => handlers.onPreview(item));

    const image = document.createElement("img");
    image.src = item.thumbnail;
    image.alt = `Foto capture ${captures.length - index}`;
    thumbButton.appendChild(image);

    const meta = document.createElement("div");
    meta.className = "gallery-meta";

    const title = document.createElement("p");
    title.className = "gallery-title";
    title.textContent = `Foto ${captures.length - index}`;

    const actions = document.createElement("div");
    actions.className = "gallery-actions";

    const downloadButton = document.createElement("button");
    downloadButton.className = "gallery-action";
    downloadButton.type = "button";
    downloadButton.textContent = "Download";
    downloadButton.addEventListener("click", () => handlers.onDownload(item));

    const deleteButton = document.createElement("button");
    deleteButton.className = "gallery-action delete";
    deleteButton.type = "button";
    deleteButton.textContent = "Hapus";
    deleteButton.addEventListener("click", () => handlers.onDelete(item));

    actions.append(downloadButton, deleteButton);
    meta.append(title, actions);
    card.append(thumbButton, meta);
    container.appendChild(card);
  });
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `capture-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
