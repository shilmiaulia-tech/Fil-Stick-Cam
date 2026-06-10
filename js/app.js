import { startWebcam } from "./webcam.js";
import { applyVideoFilter, setupFilterControls, updateActiveButtons } from "./filters.js";
import { createFaceTracker, loadFaceModels, loadStickerImages, waitForFaceApi } from "./faceTracking.js";
import { cloneCanvas, createCaptureCanvas, downloadCanvas, paintPreview } from "./capture.js";
import { createGallery, renderGallery } from "./gallery.js";

const stickerSources = {
  glasses: "./stickers/glasses.png",
  hat: "./stickers/hat.png",
  moustache: "./stickers/moustache.png",
  matalove: "./stickers/matalove.png",
  topi: "./stickers/topi.png"
};

const gallery = createGallery();
let elements = null;
let activeSticker = null;
let activeFormat = "jpeg";
let currentCapture = null;
let currentCaptureId = null;
let faceTracker = null;
let lastDetection = null;
let stickerImages = {};
let stickersLoaded = false;
let getActiveFilter = () => "normal";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
  bootstrap();
}

async function bootstrap() {
  console.log("DOM loaded");

  try {
    elements = getElements();
    validateElements(elements);
    setupUiControls();
    await initializeApp();
  } catch (error) {
    console.error("Application startup failed:", error);
    if (elements?.errorMessage) {
      elements.errorMessage.textContent = error.message;
    }
    if (elements?.cameraStatus) {
      setCameraStatus("Gagal", "error");
    }
  }
}

async function initializeApp() {
  let faceModelsReady = false;

  setCameraStatus("Memuat face-api.js");
  elements.modelStatus.textContent = "Memuat face-api.js...";

  try {
    await waitForFaceApi();
    await loadFaceModels((message) => {
      elements.modelStatus.textContent = message;
    });
    faceModelsReady = true;
  } catch (error) {
    console.error("Face model initialization failed:", error);
    elements.modelStatus.textContent = `Face tracking belum aktif: ${error.message}`;
  }

  setCameraStatus("Meminta izin kamera");
  elements.errorMessage.textContent = "";

  let stream = null;
  try {
    stream = await startWebcam(elements.video);
    validateWebcamStream(stream);
    syncCameraAspectRatio();
    elements.cameraPlaceholder.classList.add("hidden");
    elements.captureButton.disabled = false;
    setCameraStatus("Kamera aktif", "ready");
  } catch (error) {
    console.error("Camera startup failed:", error);
    setCameraStatus("Gagal", "error");
    elements.errorMessage.textContent = error.message;
    return;
  }

  stickerImages = await loadStickerImages(stickerSources);
  stickersLoaded = true;

  if (!faceModelsReady) {
    console.error("Face tracking skipped because face models are not ready.");
    return;
  }

  try {
    faceTracker = createFaceTracker({
      video: elements.video,
      canvas: elements.overlayCanvas,
      getActiveSticker: () => activeSticker,
      stickerImages,
      onDetection: (detection) => {
        lastDetection = detection;
      },
      onStatus: (message) => {
        elements.modelStatus.textContent = message;
      }
    });

    faceTracker.start();
    console.log("Sticker tracking started");
  } catch (error) {
    console.error("Face tracker startup failed:", error);
    elements.modelStatus.textContent = `Face tracking gagal: ${error.message}`;
  }
}

function setupUiControls() {
  getActiveFilter = setupFilterControls(elements.filterControls, (filterKey) => {
    applyVideoFilter(elements.video, filterKey);
  });

  setupStickerControls();
  setupFormatControls();
  setupCaptureControls();
}

function setupStickerControls() {
  elements.stickerControls.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const nextSticker = button.dataset.sticker;

      if (!nextSticker) {
        console.error("Sticker button missing data-sticker attribute:", button);
        return;
      }

      if (stickersLoaded && !stickerImages[nextSticker]) {
        console.error(`Sticker asset not loaded for key "${nextSticker}".`);
        elements.modelStatus.textContent = `Sticker "${nextSticker}" tidak ditemukan.`;
        return;
      }

      activeSticker = activeSticker === nextSticker ? null : nextSticker;
      updateActiveButtons(elements.stickerControls, "sticker", activeSticker);
      console.log(`Active sticker: ${activeSticker ?? "none"}`);
    });
  });
}

function setupFormatControls() {
  elements.formatControls.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      activeFormat = button.dataset.format;
      updateActiveButtons(elements.formatControls, "format", activeFormat);
    });
  });
}

function setupCaptureControls() {
  elements.captureButton.addEventListener("click", () => {
    try {
      const capturedCanvas = createCaptureCanvas({
        video: elements.video,
        filterKey: getActiveFilter(),
        stickerName: activeSticker,
        detection: lastDetection,
        stickerImages
      });

      currentCapture = cloneCanvas(capturedCanvas);
      paintPreview(currentCapture, elements.captureCanvas);
      elements.previewWrap.classList.add("has-image");
      elements.downloadButton.disabled = false;

      const item = gallery.add(cloneCanvas(capturedCanvas));
      currentCaptureId = item.id;
      updateGallery();
    } catch (error) {
      console.error("Capture failed:", error);
      elements.errorMessage.textContent = error.message;
    }
  });

  elements.downloadButton.addEventListener("click", () => {
    if (!currentCapture) {
      console.error("Download failed: no capture is selected.");
      return;
    }

    downloadCanvas(currentCapture, activeFormat);
  });
}

function updateGallery() {
  const captures = gallery.all();
  elements.galleryCount.textContent = `${captures.length} foto`;

  renderGallery(elements.galleryGrid, captures, {
    onPreview(item) {
      currentCapture = cloneCanvas(item.canvas);
      currentCaptureId = item.id;
      paintPreview(currentCapture, elements.captureCanvas);
      elements.previewWrap.classList.add("has-image");
      elements.downloadButton.disabled = false;
    },
    onDownload(item) {
      downloadCanvas(item.canvas, activeFormat);
    },
    onDelete(item) {
      gallery.remove(item.id);

      if (currentCaptureId === item.id) {
        const nextItem = gallery.all()[0];
        currentCapture = nextItem ? cloneCanvas(nextItem.canvas) : null;
        currentCaptureId = nextItem?.id ?? null;

        if (currentCapture) {
          paintPreview(currentCapture, elements.captureCanvas);
        } else {
          elements.previewWrap.classList.remove("has-image");
          elements.downloadButton.disabled = true;
        }
      }

      updateGallery();
    }
  });
}

function getElements() {
  return {
    video: document.querySelector("#webcamVideo"),
    overlayCanvas: document.querySelector("#overlayCanvas"),
    captureCanvas: document.querySelector("#captureCanvas"),
    cameraStatus: document.querySelector("#cameraStatus"),
    cameraPlaceholder: document.querySelector("#cameraPlaceholder"),
    errorMessage: document.querySelector("#errorMessage"),
    modelStatus: document.querySelector("#modelStatus"),
    filterControls: document.querySelector("#filterControls"),
    stickerControls: document.querySelector("#stickerControls"),
    captureButton: document.querySelector("#captureButton"),
    downloadButton: document.querySelector("#downloadButton"),
    formatControls: document.querySelector("#formatControls"),
    previewWrap: document.querySelector(".capture-preview"),
    galleryGrid: document.querySelector("#galleryGrid"),
    galleryCount: document.querySelector("#galleryCount")
  };
}

function validateElements(requiredElements) {
  const missing = Object.entries(requiredElements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Elemen HTML tidak ditemukan: ${missing.join(", ")}`);
  }
}

function validateWebcamStream(stream) {
  const videoTracks = stream?.getVideoTracks?.() ?? [];

  if (videoTracks.length === 0) {
    throw new Error("Stream kamera tidak memiliki video track.");
  }

  if (!videoTracks.some((track) => track.readyState === "live")) {
    throw new Error("Video track kamera tidak aktif.");
  }
}

function setCameraStatus(message, state) {
  elements.cameraStatus.textContent = message;
  elements.cameraStatus.classList.toggle("ready", state === "ready");
  elements.cameraStatus.classList.toggle("error", state === "error");
}

function syncCameraAspectRatio() {
  if (!elements.video.videoWidth || !elements.video.videoHeight) {
    console.error("Cannot sync camera aspect ratio: video metadata is not ready.");
    return;
  }

  elements.video.parentElement.style.aspectRatio = `${elements.video.videoWidth} / ${elements.video.videoHeight}`;
}
