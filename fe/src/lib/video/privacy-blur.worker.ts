/// <reference lib="webworker" />

import type { BoundingBox, FaceDetector, ObjectDetector } from '@mediapipe/tasks-vision';
import type { PrivacyBox } from './privacy-blur';

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

let lastTimestampMs = 0;
function nextMonotonicTimestamp(): number {
  const now = Math.round(performance.now());
  lastTimestampMs = Math.max(now, lastTimestampMs + 1);
  return lastTimestampMs;
}

async function ensureWorkerDetectors() {
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

function derivePlateBoxesFromVehicle(
  bbox: BoundingBox,
  categoryName: string,
  score: number,
  frameW: number,
  frameH: number,
): PrivacyBox[] {
  const results: PrivacyBox[] = [];
  const isMoto = categoryName === 'motorcycle';

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

function detectOnBitmap(
  bitmap: ImageBitmap,
  detectors: { faceDetector: FaceDetector | null; objectDetector: ObjectDetector | null },
): PrivacyBox[] {
  const frameW = bitmap.width || 1280;
  const frameH = bitmap.height || 720;
  const boxes: PrivacyBox[] = [];
  const ts = nextMonotonicTimestamp();

  if (detectors.faceDetector) {
    try {
      const faceRes = detectors.faceDetector.detectForVideo(bitmap, ts);
      for (const det of faceRes.detections ?? []) {
        if (!det.boundingBox) continue;
        const score = det.categories?.[0]?.score ?? 0.7;
        // Padding minimal (2% X, 4% Y) agar elips blur hanya menutupi wajah secara presisi
        boxes.push(expandAndClampBox(det.boundingBox, frameW, frameH, 0.02, 0.04, 'face', score));
      }
    } catch {
      // Abaikan frame transisi
    }
  }

  if (detectors.objectDetector) {
    try {
      const objRes = detectors.objectDetector.detectForVideo(bitmap, ts + 1);
      for (const det of objRes.detections ?? []) {
        if (!det.boundingBox) continue;
        const cat = det.categories?.[0]?.categoryName?.toLowerCase() ?? '';
        const score = det.categories?.[0]?.score ?? 0.5;

        if (VEHICLE_CATEGORIES.has(cat)) {
          boxes.push(...derivePlateBoxesFromVehicle(det.boundingBox, cat, score, frameW, frameH));
        } else if (cat === 'person') {
          // Estimasi area wajah yang ketat (tidak melebar ke bahu/latar)
          const headW = Math.max(14, Math.round(Math.min(det.boundingBox.width * 0.34, det.boundingBox.height * 0.16)));
          const headH = Math.max(16, Math.round(Math.min(det.boundingBox.height * 0.18, headW * 1.25)));
          const headX = Math.max(
            0,
            Math.min(frameW - headW, Math.round(det.boundingBox.originX + (det.boundingBox.width - headW) / 2)),
          );
          const headY = Math.max(
            0,
            Math.min(frameH - headH, Math.round(det.boundingBox.originY + det.boundingBox.height * 0.02)),
          );
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
      // Abaikan frame transisi
    }
  }

  return boxes;
}

let offscreen: OffscreenCanvas | null = null;
let offscreenCtx: OffscreenCanvasRenderingContext2D | null = null;

function renderBlurOnOffscreen(
  bitmap: ImageBitmap,
  targetW: number,
  targetH: number,
  boxes: PrivacyBox[],
): ImageBitmap | null {
  if (typeof OffscreenCanvas === 'undefined') return null;
  if (!offscreen || offscreen.width !== targetW || offscreen.height !== targetH) {
    offscreen = new OffscreenCanvas(targetW, targetH);
    offscreenCtx = offscreen.getContext('2d');
  }
  if (!offscreenCtx) return null;

  const scaleX = targetW / Math.max(1, bitmap.width);
  const scaleY = targetH / Math.max(1, bitmap.height);

  offscreenCtx.save();
  offscreenCtx.filter = 'none';
  offscreenCtx.drawImage(bitmap, 0, 0, targetW, targetH);
  offscreenCtx.restore();

  for (const rawBox of boxes) {
    const bx = Math.round(rawBox.x * scaleX);
    const by = Math.round(rawBox.y * scaleY);
    const bw = Math.round(rawBox.width * scaleX);
    const bh = Math.round(rawBox.height * scaleY);

    offscreenCtx.save();
    offscreenCtx.beginPath();
    if (rawBox.kind === 'face') {
      offscreenCtx.ellipse(bx + bw / 2, by + bh / 2, bw / 2, bh / 2, 0, 0, Math.PI * 2);
    } else {
      const r = Math.min(6, bw / 4, bh / 4);
      offscreenCtx.roundRect(bx, by, bw, bh, r);
    }
    offscreenCtx.clip();
    offscreenCtx.filter = 'blur(15px)';
    const margin = 24;
    const sx = Math.max(0, bx - margin);
    const sy = Math.max(0, by - margin);
    const sw = Math.min(targetW - sx, bw + margin * 2);
    const sh = Math.min(targetH - sy, bh + margin * 2);
    offscreenCtx.drawImage(
      bitmap,
      sx / scaleX,
      sy / scaleY,
      sw / scaleX,
      sh / scaleY,
      sx,
      sy,
      sw,
      sh,
    );
    offscreenCtx.restore();
  }

  return offscreen.transferToImageBitmap();
}

type WorkerRequest =
  | { type: 'init'; id: number }
  | { type: 'detect'; id: number; bitmap: ImageBitmap }
  | {
      type: 'redact_frame';
      id: number;
      bitmap: ImageBitmap;
      targetW: number;
      targetH: number;
      detect: boolean;
      previousBoxes: PrivacyBox[];
    };

const workerSelf = self as unknown as DedicatedWorkerGlobalScope;

workerSelf.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  if (!msg) return;

  if (msg.type === 'init') {
    const det = await ensureWorkerDetectors();
    workerSelf.postMessage({
      type: 'init_done',
      id: msg.id,
      ready: Boolean(det.faceDetector || det.objectDetector),
    });
    return;
  }

  if (msg.type === 'detect') {
    try {
      const det = await ensureWorkerDetectors();
      const boxes = detectOnBitmap(msg.bitmap, det);
      msg.bitmap.close();
      workerSelf.postMessage({ type: 'detect_done', id: msg.id, boxes });
    } catch {
      try {
        msg.bitmap.close();
      } catch {
        // ignore
      }
      workerSelf.postMessage({ type: 'detect_done', id: msg.id, boxes: [] });
    }
    return;
  }

  if (msg.type === 'redact_frame') {
    try {
      let boxes = msg.previousBoxes;
      if (msg.detect) {
        const det = await ensureWorkerDetectors();
        boxes = detectOnBitmap(msg.bitmap, det);
      }
      const redactedBitmap = renderBlurOnOffscreen(msg.bitmap, msg.targetW, msg.targetH, boxes);
      msg.bitmap.close();
      if (redactedBitmap) {
        workerSelf.postMessage(
          { type: 'redact_done', id: msg.id, boxes, bitmap: redactedBitmap },
          [redactedBitmap],
        );
      } else {
        workerSelf.postMessage({ type: 'redact_done', id: msg.id, boxes, bitmap: null });
      }
    } catch {
      try {
        msg.bitmap.close();
      } catch {
        // ignore
      }
      workerSelf.postMessage({
        type: 'redact_done',
        id: msg.id,
        boxes: msg.previousBoxes,
        bitmap: null,
      });
    }
  }
};
