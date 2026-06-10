import { getFilterCss } from "./filters.js";
import { drawStickerOnCanvas } from "./faceTracking.js";

const MIME_TYPES = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp"
};

const EXTENSIONS = {
  jpeg: "jpg",
  png: "png",
  webp: "webp"
};

export function createCaptureCanvas({ video, filterKey, stickerName, detection, stickerImages }) {
  if (!video?.videoWidth || !video?.videoHeight) {
    throw new Error("Capture gagal: video webcam belum siap.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Capture gagal: canvas tidak mendukung context 2D.");
  }

  context.save();
  context.translate(canvas.width, 0);
  context.scale(-1, 1);
  context.filter = getFilterCss(filterKey);
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  context.filter = "none";
  drawStickerOnCanvas(context, stickerName, detection, stickerImages);
  context.restore();

  return canvas;
}

export function paintPreview(sourceCanvas, previewCanvas) {
  if (!sourceCanvas?.width || !sourceCanvas?.height || !previewCanvas) {
    throw new Error("Preview gagal: canvas capture tidak valid.");
  }

  previewCanvas.width = sourceCanvas.width;
  previewCanvas.height = sourceCanvas.height;

  const context = previewCanvas.getContext("2d");
  context.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  context.drawImage(sourceCanvas, 0, 0);
}

export function canvasToDataUrl(canvas, format, quality = 0.92) {
  if (!canvas?.width || !canvas?.height) {
    throw new Error("Export gagal: canvas kosong atau belum siap.");
  }

  return canvas.toDataURL(MIME_TYPES[format] ?? MIME_TYPES.jpeg, quality);
}

export function downloadCanvas(canvas, format, filePrefix = "capture") {
  const dataUrl = canvasToDataUrl(canvas, format);
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${filePrefix}-${timestamp()}.${EXTENSIONS[format] ?? "jpg"}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function cloneCanvas(canvas) {
  if (!canvas?.width || !canvas?.height) {
    throw new Error("Clone canvas gagal: canvas kosong atau belum siap.");
  }

  const clone = document.createElement("canvas");
  clone.width = canvas.width;
  clone.height = canvas.height;
  clone.getContext("2d").drawImage(canvas, 0, 0);
  return clone;
}

function timestamp() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join("");
}
