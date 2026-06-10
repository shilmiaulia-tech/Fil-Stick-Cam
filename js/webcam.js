const CAMERA_CONSTRAINTS = {
  video: {
    facingMode: "user",
    width: { ideal: 1280 },
    height: { ideal: 720 }
  },
  audio: false
};

export async function startWebcam(videoElement) {
  validateVideoElement(videoElement);
  validateMediaDevices();

  console.log("Requesting camera permission");

  let stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
    console.log("Camera permission granted");
  } catch (error) {
    console.error("Camera permission failed:", error);
    throw new Error(getCameraErrorMessage(error));
  }

  validateStream(stream);
  videoElement.srcObject = stream;

  try {
    await waitForVideoMetadata(videoElement);
    await videoElement.play();
  } catch (error) {
    console.error("Camera video initialization failed:", error);
    throw new Error(`Video webcam gagal dijalankan: ${error.message}`);
  }

  console.log("Camera initialized");
  return stream;
}

export function stopWebcam(stream) {
  stream?.getTracks?.().forEach((track) => track.stop());
}

function validateVideoElement(videoElement) {
  if (!(videoElement instanceof HTMLVideoElement)) {
    throw new Error("Elemen video webcam tidak valid atau tidak ditemukan.");
  }
}

function validateMediaDevices() {
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

  if (window.isSecureContext === false && !isLocalHost) {
    throw new Error("getUserMedia membutuhkan HTTPS atau localhost.");
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Browser tidak mendukung navigator.mediaDevices.getUserMedia().");
  }
}

function validateStream(stream) {
  const videoTracks = stream?.getVideoTracks?.() ?? [];

  if (videoTracks.length === 0) {
    throw new Error("Izin kamera diberikan, tetapi tidak ada video track yang tersedia.");
  }

  if (!videoTracks.some((track) => track.readyState === "live")) {
    throw new Error("Video track kamera tidak aktif.");
  }
}

function waitForVideoMetadata(videoElement, timeout = 10000) {
  if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Timeout menunggu metadata video webcam."));
    }, timeout);

    function cleanup() {
      window.clearTimeout(timeoutId);
      videoElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
      videoElement.removeEventListener("error", handleVideoError);
    }

    function handleLoadedMetadata() {
      if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
        cleanup();
        resolve();
      }
    }

    function handleVideoError() {
      cleanup();
      reject(new Error("Elemen video gagal menerima stream kamera."));
    }

    videoElement.addEventListener("loadedmetadata", handleLoadedMetadata);
    videoElement.addEventListener("error", handleVideoError);
  });
}

function getCameraErrorMessage(error) {
  if (error?.name === "NotAllowedError") {
    return "Izin kamera ditolak. Izinkan akses kamera dari browser.";
  }

  if (error?.name === "NotFoundError") {
    return "Kamera tidak ditemukan di perangkat ini.";
  }

  if (error?.name === "NotReadableError") {
    return "Kamera sedang dipakai aplikasi lain atau tidak bisa dibaca.";
  }

  if (error?.name === "OverconstrainedError") {
    return "Kamera tidak mendukung constraint video yang diminta.";
  }

  if (error?.name === "SecurityError") {
    return "Akses kamera diblokir karena konteks halaman tidak aman.";
  }

  return `Gagal mengakses webcam: ${error?.message ?? "error tidak diketahui"}`;
}
