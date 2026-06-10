const MODEL_URL = "./models";
const DETECTION_INTERVAL = 90;
const loggedWarnings = new Set();

export async function waitForFaceApi(timeout = 7000) {
  const startedAt = Date.now();

  while (!window.faceapi) {
    if (Date.now() - startedAt > timeout) {
      throw new Error("Library face-api.js belum tersedia. Pastikan assets/face-api.min.js berhasil dimuat.");
    }

    await delay(100);
  }

  console.log("face-api.js loaded");
  return window.faceapi;
}

export async function loadFaceModels(onStatus = () => {}) {
  const faceApi = await waitForFaceApi();
  validateFaceApiNets(faceApi);
  onStatus("Memuat model face-api.js...");

  try {
    await Promise.all([
      faceApi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceApi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
    ]);
  } catch (error) {
    console.error("Face model loading failed:", error);
    throw new Error(`Model face-api.js gagal dimuat dari ${MODEL_URL}: ${error.message}`);
  }

  console.log("Face models loaded");
  onStatus("Face tracking aktif");
  return faceApi;
}

export async function loadStickerImages(stickerSources) {
  if (!stickerSources || typeof stickerSources !== "object") {
    console.error("Sticker sources are invalid:", stickerSources);
    return {};
  }

  const entries = await Promise.all(
    Object.entries(stickerSources).map(async ([name, src]) => {
      try {
        const image = await loadImage(src);
        return [name, image];
      } catch (error) {
        console.error(`Sticker "${name}" failed to load from ${src}:`, error);
        return null;
      }
    })
  );

  const loadedStickers = Object.fromEntries(entries.filter(Boolean));
  console.log(`Sticker assets loaded: ${Object.keys(loadedStickers).join(", ") || "none"}`);
  return loadedStickers;
}

export function createFaceTracker({ video, canvas, getActiveSticker, stickerImages, onDetection, onStatus }) {
  validateTrackerInputs(video, canvas);

  const faceApi = window.faceapi;
  if (!faceApi) {
    throw new Error("face-api.js belum tersedia saat membuat face tracker.");
  }

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas overlay tidak bisa membuat context 2D.");
  }

  let running = false;
  let lastDetection = null;
  let hasLoggedFace = false;
  let hasLoggedLandmarks = false;
  const options = new faceApi.TinyFaceDetectorOptions({
    inputSize: 224,
    scoreThreshold: 0.45
  });

  function resizeCanvas() {
    if (!isVideoReady(video)) return;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
  }

  async function loop() {
    if (!running) return;

    if (!isVideoReady(video)) {
      scheduleNextLoop();
      return;
    }

    resizeCanvas();

    try {
      const detection = await faceApi
        .detectSingleFace(video, options)
        .withFaceLandmarks();

      if (!detection) {
        lastDetection = null;
        onDetection?.(null);
        drawOverlay(context, canvas, null, getActiveSticker?.(), stickerImages);
        scheduleNextLoop();
        return;
      }

      if (!hasLoggedFace) {
        console.log("Face detected");
        hasLoggedFace = true;
      }

      if (!hasValidLandmarks(detection.landmarks)) {
        console.error("Invalid landmarks detected:", detection.landmarks);
        lastDetection = null;
        onDetection?.(null);
        drawOverlay(context, canvas, null, getActiveSticker?.(), stickerImages);
        scheduleNextLoop();
        return;
      }

      if (!hasLoggedLandmarks) {
        console.log("Landmarks detected");
        hasLoggedLandmarks = true;
      }

      lastDetection = detection;
      onDetection?.(lastDetection);
      drawOverlay(context, canvas, lastDetection, getActiveSticker?.(), stickerImages);
    } catch (error) {
      console.error("Face tracking loop failed:", error);
      onStatus?.(`Face tracking gagal: ${error.message}`);
    }

    scheduleNextLoop();
  }

  function scheduleNextLoop() {
    window.setTimeout(loop, DETECTION_INTERVAL);
  }

  return {
    start() {
      if (running) return;
      running = true;
      resizeCanvas();
      loop();
    },
    stop() {
      running = false;
      context.clearRect(0, 0, canvas.width, canvas.height);
    },
    getLastDetection() {
      return lastDetection;
    },
    resizeCanvas
  };
}

export function drawStickerOnCanvas(context, stickerName, detection, stickerImages) {
  if (!context || !stickerName || !detection?.landmarks) return;

  if (!hasValidLandmarks(detection.landmarks)) {
    warnOnce("invalid-sticker-landmarks", "Sticker skipped: landmarks are missing or invalid.");
    return;
  }

  const stickerImage = stickerImages?.[stickerName];
  if (!isImageReady(stickerImage)) {
    warnOnce(`missing-sticker-${stickerName}`, `Sticker skipped: image for "${stickerName}" is not loaded.`);
    return;
  }

  const box = getStickerBox(stickerName, detection.landmarks, stickerImage);
  if (!isValidBox(box)) {
    warnOnce(`invalid-sticker-box-${stickerName}`, `Sticker skipped: invalid position box for "${stickerName}".`);
    return;
  }

  context.save();
  context.translate(box.x + box.width / 2, box.y + box.height / 2);
  context.rotate(box.rotation);
  context.drawImage(
    stickerImage,
    -box.width / 2,
    -box.height / 2,
    box.width,
    box.height
  );
  context.restore();
}

function drawOverlay(context, canvas, detection, activeSticker, stickerImages) {
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawStickerOnCanvas(context, activeSticker, detection, stickerImages);
}

function getStickerBox(stickerName, landmarks, stickerImage) {
  const metrics = getFaceMetrics(landmarks);
  const aspectRatio = getImageAspectRatio(stickerImage);

  if (!metrics || !aspectRatio) return null;

  const { eyeCenter, eyeDistance, mouthCenter, nose, rotation } = metrics;
  const stickerConfigs = {
    glasses: {
      scale: 2.35,
      x: (width) => eyeCenter.x - width / 2,
      y: (height) => eyeCenter.y - height * 0.5
    },
    matalove: {
      scale: 2.55,
      x: (width) => eyeCenter.x - width / 2,
      y: (height) => eyeCenter.y - height * 0.58
    },
    moustache: {
      scale: 1.65,
      x: (width) => nose.x - width / 2,
      y: (height) => mouthCenter.y - height * 0.58
    },
    hat: {
      scale: 2.85,
      x: (width) => eyeCenter.x - width / 2,
      y: (height) => eyeCenter.y - height * 1.32
    },
    topi: {
      scale: 2.55,
      x: (width) => eyeCenter.x - width / 2,
      y: (height) => eyeCenter.y - height * 1.22
    }
  };

  const config = stickerConfigs[stickerName];
  if (!config) return null;

  const width = eyeDistance * config.scale;
  const height = width * aspectRatio;

  return {
    x: config.x(width, height),
    y: config.y(height, width),
    width,
    height,
    rotation
  };
}

function getFaceMetrics(landmarks) {
  const leftEyePoints = getLandmarkPoints(landmarks, "getLeftEye", 2);
  const rightEyePoints = getLandmarkPoints(landmarks, "getRightEye", 2);
  const nosePoints = getLandmarkPoints(landmarks, "getNose", 1);
  const mouthPoints = getLandmarkPoints(landmarks, "getMouth", 2);

  if (!leftEyePoints || !rightEyePoints || !nosePoints || !mouthPoints) {
    return null;
  }

  const leftEye = centerOf(leftEyePoints);
  const rightEye = centerOf(rightEyePoints);
  const nose = centerOf(nosePoints);
  const mouthCenter = getMouthCenter(mouthPoints);

  if (!isValidPoint(leftEye) || !isValidPoint(rightEye) || !isValidPoint(nose) || !isValidPoint(mouthCenter)) {
    return null;
  }

  const eyeDistance = distance(leftEye, rightEye);
  if (!Number.isFinite(eyeDistance) || eyeDistance <= 0) {
    return null;
  }

  return {
    leftEye,
    rightEye,
    nose,
    mouthCenter,
    eyeCenter: midpoint(leftEye, rightEye),
    eyeDistance,
    rotation: Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x)
  };
}

function hasValidLandmarks(landmarks) {
  return Boolean(getFaceMetrics(landmarks));
}

function getLandmarkPoints(landmarks, getterName, minimumLength) {
  if (!landmarks || typeof landmarks[getterName] !== "function") return null;

  try {
    const points = landmarks[getterName]();
    if (!Array.isArray(points) || points.length < minimumLength) return null;

    const validPoints = points.filter(isValidPoint);
    return validPoints.length >= minimumLength ? validPoints : null;
  } catch (error) {
    console.error(`Failed to read landmarks with ${getterName}:`, error);
    return null;
  }
}

function getMouthCenter(mouthPoints) {
  if (isValidPoint(mouthPoints[3]) && isValidPoint(mouthPoints[9])) {
    return midpoint(mouthPoints[3], mouthPoints[9]);
  }

  return centerOf(mouthPoints);
}

function centerOf(points) {
  const validPoints = points.filter(isValidPoint);
  if (validPoints.length === 0) return null;

  const total = validPoints.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y
    }),
    { x: 0, y: 0 }
  );

  return {
    x: total.x / validPoints.length,
    y: total.y / validPoints.length
  };
}

function midpoint(pointA, pointB) {
  if (!isValidPoint(pointA) || !isValidPoint(pointB)) return null;

  return {
    x: (pointA.x + pointB.x) / 2,
    y: (pointA.y + pointB.y) / 2
  };
}

function distance(pointA, pointB) {
  if (!isValidPoint(pointA) || !isValidPoint(pointB)) return 0;
  return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);
}

function isValidPoint(point) {
  return Number.isFinite(point?.x) && Number.isFinite(point?.y);
}

function getImageAspectRatio(image) {
  if (!isImageReady(image)) return null;
  return image.naturalHeight / image.naturalWidth;
}

function isImageReady(image) {
  return Boolean(image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
}

function isValidBox(box) {
  return Boolean(
    box &&
    Number.isFinite(box.x) &&
    Number.isFinite(box.y) &&
    Number.isFinite(box.width) &&
    Number.isFinite(box.height) &&
    Number.isFinite(box.rotation) &&
    box.width > 0 &&
    box.height > 0
  );
}

function isVideoReady(video) {
  return Boolean(video?.videoWidth > 0 && video?.videoHeight > 0 && video.readyState >= 2);
}

function validateFaceApiNets(faceApi) {
  if (!faceApi?.nets?.tinyFaceDetector || !faceApi?.nets?.faceLandmark68Net) {
    throw new Error("face-api.js tidak memiliki TinyFaceDetector atau FaceLandmark68Net.");
  }
}

function validateTrackerInputs(video, canvas) {
  if (!(video instanceof HTMLVideoElement)) {
    throw new Error("Face tracker membutuhkan elemen video yang valid.");
  }

  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("Face tracker membutuhkan canvas overlay yang valid.");
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    if (/^https?:\/\//i.test(src)) {
      image.crossOrigin = "anonymous";
    }

    image.onload = () => {
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        resolve(image);
      } else {
        reject(new Error("gambar berhasil load tetapi ukurannya 0"));
      }
    };
    image.onerror = () => reject(new Error(`Gagal memuat sticker: ${src}`));
    image.src = src;
  });
}

function warnOnce(key, message) {
  if (loggedWarnings.has(key)) return;
  loggedWarnings.add(key);
  console.warn(message);
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
