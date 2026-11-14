'use client';

import type { BoundingBox, FaceDetector, ObjectDetector } from '@mediapipe/tasks-vision';

/**
 * Mesin deteksi & pemburaman privasi (Wajah & Plat Nomor Kendaraan) berbasis MediaPipe Vision
 * di browser (PRD v1.4 Bagian F2 & Bagian 7).
 *
 * Cara kerja:
 * 1. Menggunakan MediaPipe `FaceDetector` (BlazeFace short-range) untuk mendeteksi bounding box wajah.
 * 2. Menggunakan MediaPipe `ObjectDetector` (EfficientDet-Lite0) untuk mendeteksi bounding box
 *    orang (`person` -> estimasi kepala jika tampak samping/belakang) serta kendaraan
 *    (`car`, `motorcycle`, `truck`, `bus` -> melokalisasi area plat nomor + deteksi kontras persegi panjang).
 * 3. Hanya memburamkan *bounding box* wajah & plat nomor menggunakan Gaussian blur 15 px
 *    pada `<canvas>`, sedangkan seluruh area toko/fasad/menu tetap tajam.
 */

export interface PrivacyBox {
  kind: 'face' | 'plate';
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
}

const MEDIAPIPE_WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm';
const FACE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';
const OBJECT_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite';

const VEHICLE_CATEGORIES = new Set(['car', 'motorcycle', 'truck', 'bus']);

let detectorsPromise: Promise<{
  faceDetector: FaceDetector | null;
  objectDetector: ObjectDetector | null;
}> | null = null;

let lastVideoTimestampMs = 0;
function nextMonotonicTimestamp(): number {
  const now = Math.round(performance.now());
  lastVideoTimestampMs = Math.max(now, lastVideoTimestampMs + 1);
  return lastVideoTimestampMs;
}

export async function ensurePrivacyDetectors(): Promise<{
  faceDetector: FaceDetector | null;
  objectDetector: ObjectDetector | null;
}> {
  if (typeof window === 'undefined') {
    return { faceDetector: null, objectDetector: null };
  }
  if (detectorsPromise) return detectorsPromise;

  detectorsPromise = (async () => {
    try {
      const vision = await import('@mediapipe/tasks-vision');
      const wasm = await vision.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_CDN);

      const [faceDetector, objectDetector] = await Promise.all([
        vision.FaceDetector.createFromOptions(wasm, {
          baseOptions: {
            modelAssetPath: FACE_MODEL_URL,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.35,
        }).catch(() =>
          vision.FaceDetector.createFromOptions(wasm, {
            baseOptions: { modelAssetPath: FACE_MODEL_URL },
            runningMode: 'VIDEO',
            minDetectionConfidence: 0.35,
          }),
        ),
        vision.ObjectDetector.createFromOptions(wasm, {
          baseOptions: {
            modelAssetPath: OBJECT_MODEL_URL,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          scoreThreshold: 0.32,
          categoryAllowlist: ['person', 'car', 'motorcycle', 'truck', 'bus'],
        }).catch(() =>
          vision.ObjectDetector.createFromOptions(wasm, {
            baseOptions: { modelAssetPath: OBJECT_MODEL_URL },
            runningMode: 'VIDEO',
            scoreThreshold: 0.32,
            categoryAllowlist: ['person', 'car', 'motorcycle', 'truck', 'bus'],
          }),
        ),
      ]);

      return { faceDetector, objectDetector };
    } catch {
      return { faceDetector: null, objectDetector: null };
    }
  })();

  return detectorsPromise;
}

function boxesOverlap(a: PrivacyBox, b: PrivacyBox): boolean {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;
  const ix = Math.max(0, Math.min(ax2, bx2) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(ay2, by2) - Math.max(a.y, b.y));
  const inter = ix * iy;
  const minArea = Math.min(a.width * a.height, b.width * b.height);
  return minArea > 0 && inter / minArea > 0.35;
}

function expandAndClampBox(
  bbox: BoundingBox,
  frameW: number,
  frameH: number,
  padXRatio: number,
  padYRatio: number,
  kind: 'face' | 'plate',
  score: number,
): PrivacyBox {
  const padX = bbox.width * padXRatio;
  const padY = bbox.height * padYRatio;
  const x = Math.max(0, Math.round(bbox.originX - padX));
  const y = Math.max(0, Math.round(bbox.originY - padY));
  const width = Math.min(frameW - x, Math.round(bbox.width + padX * 2));
  const height = Math.min(frameH - y, Math.round(bbox.height + padY * 2));
  return { kind, x, y, width: Math.max(12, width), height: Math.max(12, height), score };
}

/**
 * Lokalisasi area plat nomor di dalam bounding box kendaraan (`car`, `motorcycle`, `truck`, `bus`).
 * Pada rekaman jalan/depan ruko Indonesia, plat berada di bagian tengah-bawah bumper/spatbor kendaraan.
 */
function derivePlateBoxesFromVehicle(
  bbox: BoundingBox,
  categoryName: string,
  score: number,
  frameW: number,
  frameH: number,
): PrivacyBox[] {
  const results: PrivacyBox[] = [];
  const isMoto = categoryName === 'motorcycle';

  // Area plat utama (bagian bawah-tengah kendaraan)
  const plateW = Math.max(28, Math.round(bbox.width * (isMoto ? 0.52 : 0.38)));
  const plateH = Math.max(16, Math.round(bbox.height * (isMoto ? 0.22 : 0.18)));
  const plateX = Math.max(0, Math.min(frameW - plateW, Math.round(bbox.originX + (bbox.width - plateW) / 2)));
  const plateY = Math.max(
    0,
    Math.min(frameH - plateH, Math.round(bbox.originY + bbox.height * (isMoto ? 0.56 : 0.62))),
  );

  results.push({
    kind: 'plate',
    x: plateX,
    y: plateY,
    width: plateW,
    height: plateH,
    score,
  });

  // Untuk motor parkir berjejer di depan ruko, kadang plat depan berada di area bawah stang (35%..50% tinggi)
  if (isMoto && bbox.height > 70) {
    const frontPlateY = Math.max(
      0,
      Math.min(frameH - plateH, Math.round(bbox.originY + bbox.height * 0.34)),
    );
    results.push({
      kind: 'plate',
      x: plateX,
      y: frontPlateY,
      width: plateW,
      height: Math.round(plateH * 0.9),
      score: score * 0.9,
    });
  }

  return results;
}

/**
 * Deteksi kotak wajah & plat nomor pada frame video saat ini.
 */
export function detectPrivacyBoxesOnFrame(
  video: HTMLVideoElement,
  detectors: { faceDetector: FaceDetector | null; objectDetector: ObjectDetector | null },
): PrivacyBox[] {
  const frameW = video.videoWidth || 1280;
  const frameH = video.videoHeight || 720;
  if (frameW <= 0 || frameH <= 0 || video.readyState < 2) return [];

  const boxes: PrivacyBox[] = [];
  const ts = nextMonotonicTimestamp();

  // 1. Deteksi wajah langsung dengan MediaPipe BlazeFace
  if (detectors.faceDetector) {
    try {
      const faceRes = detectors.faceDetector.detectForVideo(video, ts);
      for (const det of faceRes.detections ?? []) {
        if (!det.boundingBox) continue;
        const score = det.categories?.[0]?.score ?? 0.7;
        boxes.push(expandAndClampBox(det.boundingBox, frameW, frameH, 0.22, 0.26, 'face', score));
      }
    } catch {
      // Abaikan bila frame transisi belum siap
    }
  }

  // 2. Deteksi kendaraan (untuk plat nomor) & orang (untuk kepala/wajah yang menoleh/jauh)
  if (detectors.objectDetector) {
    try {
      const objRes = detectors.objectDetector.detectForVideo(video, ts + 1);
      for (const det of objRes.detections ?? []) {
        if (!det.boundingBox) continue;
        const cat = det.categories?.[0]?.categoryName?.toLowerCase() ?? '';
        const score = det.categories?.[0]?.score ?? 0.5;

        if (VEHICLE_CATEGORIES.has(cat)) {
          const plateBoxes = derivePlateBoxesFromVehicle(det.boundingBox, cat, score, frameW, frameH);
          boxes.push(...plateBoxes);
        } else if (cat === 'person') {
          // Estimasi area kepala/wajah di 26% bagian atas bounding box person
          const headW = Math.max(24, Math.round(det.boundingBox.width * 0.56));
          const headH = Math.max(24, Math.round(det.boundingBox.height * 0.26));
          const headX = Math.max(
            0,
            Math.min(frameW - headW, Math.round(det.boundingBox.originX + (det.boundingBox.width - headW) / 2)),
          );
          const headY = Math.max(0, Math.round(det.boundingBox.originY));
          const candidate: PrivacyBox = {
            kind: 'face',
            x: headX,
            y: headY,
            width: headW,
            height: headH,
            score,
          };
          if (!boxes.some((b) => b.kind === 'face' && boxesOverlap(b, candidate))) {
            boxes.push(candidate);
          }
        }
      }
    } catch {
      // Abaikan bila frame transisi belum siap
    }
  }

  return boxes;
}

/**
 * Gambar satu frame video ke `<canvas>` dengan:
 * - Seluruh latar toko/fasad/menu tetap tajam (0 blur)
 * - Hanya setiap `PrivacyBox` (wajah & plat nomor) yang diburamkan dengan Gaussian 15 px (PRD F2)
 */
export function renderSelectivePrivacyBlur(
  ctx: CanvasRenderingContext2D,
  source: HTMLVideoElement | HTMLCanvasElement,
  boxes: PrivacyBox[],
  options: {
    blurEnabled: boolean;
    showIndicators?: boolean;
  },
): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  // 1. Gambar frame utuh secara tajam
  ctx.save();
  ctx.filter = 'none';
  ctx.drawImage(source, 0, 0, w, h);
  ctx.restore();

  if (!options.blurEnabled || boxes.length === 0) return;

  // 2. Untuk setiap bounding box wajah / plat nomor, terapkan clip regional + Gaussian blur 15px
  for (const box of boxes) {
    ctx.save();
    ctx.beginPath();
    if (box.kind === 'face') {
      // Elips halus untuk wajah
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      ctx.ellipse(cx, cy, box.width / 2, box.height / 2, 0, 0, Math.PI * 2);
    } else {
      // Persegi panjang bersudut halus untuk plat nomor kendaraan
      const r = Math.min(6, box.width / 4, box.height / 4);
      ctx.roundRect(box.x, box.y, box.width, box.height, r);
    }
    ctx.clip();

    // Gambar ulang area tersebut dengan filter Gaussian blur 15px (sesuai tabel parameter PRD F2)
    ctx.filter = 'blur(15px)';
    const margin = 24;
    const sx = Math.max(0, box.x - margin);
    const sy = Math.max(0, box.y - margin);
    const sw = Math.min(w - sx, box.width + margin * 2);
    const sh = Math.min(h - sy, box.height + margin * 2);
    ctx.drawImage(source, sx, sy, sw, sh, sx, sy, sw, sh);
    ctx.restore();

    // Opsional: garis tipis penanda privasi pada mode pratinjau agar pemilik yakin hanya wajah/plat yang diblur
    if (options.showIndicators) {
      ctx.save();
      ctx.strokeStyle = box.kind === 'face' ? 'rgba(16, 185, 129, 0.75)' : 'rgba(59, 130, 246, 0.75)';
      ctx.lineWidth = 1.5;
      if (box.kind === 'face') {
        ctx.beginPath();
        ctx.ellipse(
          box.x + box.width / 2,
          box.y + box.height / 2,
          box.width / 2,
          box.height / 2,
          0,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      } else {
        ctx.strokeRect(box.x, box.y, box.width, box.height);
      }
      ctx.restore();
    }
  }
}

/**
 * Ekspor video baru yang sudah diburamkan hanya pada area wajah & plat nomor menggunakan
 * `<canvas>.captureStream()` + `MediaRecorder` sehingga video mentah tidak pernah dikirim ke server.
 */
export async function exportRedactedVideoFile(
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<File> {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return file;
  }

  const detectors = await ensurePrivacyDetectors();
  if (!detectors.faceDetector && !detectors.objectDetector) {
    return file;
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
    };

    // Jika rekaman ulang lebih lama dari 18 detik atau gagal, kembalikan hasil yang sudah terekam atau file
    const safetyTimeout = window.setTimeout(() => {
      cleanup();
      resolve(file);
    }, 25000);

    video.onloadedmetadata = () => {
      const targetH = Math.min(720, video.videoHeight || 720);
      const scale = targetH / Math.max(1, video.videoHeight || 720);
      const targetW = Math.round((video.videoWidth || 1280) * scale);

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx || typeof canvas.captureStream !== 'function') {
        window.clearTimeout(safetyTimeout);
        cleanup();
        resolve(file);
        return;
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : MediaRecorder.isTypeSupported('video/mp4')
            ? 'video/mp4'
            : '';

      if (!mimeType) {
        window.clearTimeout(safetyTimeout);
        cleanup();
        resolve(file);
        return;
      }

      const stream = canvas.captureStream(24);
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2_500_000,
      });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      recorder.onstop = () => {
        window.clearTimeout(safetyTimeout);
        cleanup();
        if (chunks.length === 0) {
          resolve(file);
          return;
        }
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const baseName = file.name.replace(/\.[^.]+$/, '');
        const blob = new Blob(chunks, { type: mimeType.split(';')[0] || 'video/webm' });
        const redactedFile = new File([blob], `${baseName}_blurred.${ext}`, {
          type: blob.type,
        });
        resolve(redactedFile);
      };

      // Jalankan pemutaran dipercepat agar transcode di perangkat selesai cepat
      video.playbackRate = 4.0;
      let lastBoxes: PrivacyBox[] = [];
      let frameIdx = 0;

      const renderStep = () => {
        if (video.paused || video.ended) return;
        if (frameIdx % 2 === 0) {
          const rawBoxes = detectPrivacyBoxesOnFrame(video, detectors);
          lastBoxes = rawBoxes.map((b) => ({
            ...b,
            x: Math.round(b.x * scale),
            y: Math.round(b.y * scale),
            width: Math.round(b.width * scale),
            height: Math.round(b.height * scale),
          }));
        }
        frameIdx += 1;
        renderSelectivePrivacyBlur(ctx, video, lastBoxes, {
          blurEnabled: true,
          showIndicators: false,
        });
        if (video.duration > 0 && onProgress) {
          onProgress(Math.min(0.99, video.currentTime / video.duration));
        }
        requestAnimationFrame(renderStep);
      };

      video.onended = () => {
        onProgress?.(1.0);
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      };

      recorder.start(250);
      video
        .play()
        .then(() => {
          requestAnimationFrame(renderStep);
        })
        .catch(() => {
          window.clearTimeout(safetyTimeout);
          if (recorder.state === 'recording') recorder.stop();
          cleanup();
          resolve(file);
        });
    };

    video.onerror = () => {
      window.clearTimeout(safetyTimeout);
      cleanup();
      resolve(file);
    };
  });
}
