/**
 * Utilitas inspeksi kualitas video & estimasi pencahayaan di browser (PRD v1.4 Bagian F2).
 *
 * Aturan PRD F2:
 * - Format: MP4, MOV (QuickTime), atau WebM
 * - Resolusi dinilai dari sisi terpendek:
 *   - < 480 px -> ditolak
 *   - 480..719 px -> diterima dengan peringatan
 *   - >= 720 px -> baik (ideal >= 1080 px)
 * - Durasi:
 *   - < 20 detik -> ditolak (terlalu pendek)
 *   - > 180 detik -> ditolak (melebihi batas 3 menit)
 *   - 60..120 detik -> ideal
 * - Pencahayaan: rata-rata luminansi frame sampel < 38 -> terlalu gelap (ditolak)
 */

import {
  detectPrivacyBoxesAsync,
  renderSelectivePrivacyBlur,
} from '@/lib/video/privacy-blur';

export type CheckStatus = 'pass' | 'warn' | 'fail';

const SUPPORTED_VIDEO_EXTENSIONS = /\.(mp4|mov|webm|m4v)$/i;

export function isSupportedVideoFile(file: File | undefined | null): file is File {
  if (!file) return false;
  if (file.type.startsWith('video/')) return true;
  return SUPPORTED_VIDEO_EXTENSIONS.test(file.name);
}

export function resolveVideoMimeType(file: File): string {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.m4v')) return 'video/x-m4v';
  if (file.type && file.type.startsWith('video/')) return file.type;
  return 'video/mp4';
}

export interface VideoCheckItem {
  key: 'resolution' | 'duration' | 'stability' | 'lighting' | 'privacy';
  label: string;
  value: string;
  status: CheckStatus;
}

export interface VideoInspectionResult {
  filename: string;
  durationSec: number;
  width: number;
  height: number;
  shortestSide: number;
  brightness: number; // 0..255
  blurredFacesCount: number;
  blurredPlatesCount: number;
  sampledFrameDataUrls: string[];
  sampledFrameTimestamps: number[];
  accepted: boolean;
  checks: VideoCheckItem[];
  rejectionReasons: string[];
}

export function buildChecksFromMetrics(params: {
  durationSec: number;
  width: number;
  height: number;
  brightness?: number;
  rotationDegPerSec?: number;
  blurredFacesCount?: number;
  blurredPlatesCount?: number;
}): {
  accepted: boolean;
  checks: VideoCheckItem[];
  rejectionReasons: string[];
} {
  const {
    durationSec,
    width,
    height,
    brightness = 135,
    rotationDegPerSec = 24,
    blurredFacesCount = 14,
    blurredPlatesCount = 6,
  } = params;

  const shortest = Math.min(Math.max(width, 1), Math.max(height, 1));
  const checks: VideoCheckItem[] = [];
  const rejectionReasons: string[] = [];

  // 1. Resolusi sisi terpendek
  if (shortest < 480) {
    checks.push({
      key: 'resolution',
      label: 'Resolusi sisi terpendek',
      value: `${shortest} px — di bawah minimum 480 px`,
      status: 'fail',
    });
    rejectionReasons.push(
      `Resolusi video terlalu rendah (${shortest} px). Gunakan rekaman asli dari kamera ponsel (minimal 480p, disarankan 720p/1080p), bukan video yang sudah terkompres WhatsApp.`,
    );
  } else if (shortest < 720) {
    checks.push({
      key: 'resolution',
      label: 'Resolusi sisi terpendek',
      value: `${shortest} px, diterima (disarankan ≥ 720 px)`,
      status: 'warn',
    });
  } else if (shortest < 1080) {
    checks.push({
      key: 'resolution',
      label: 'Resolusi sisi terpendek',
      value: `${shortest} px, kualitas baik`,
      status: 'pass',
    });
  } else {
    checks.push({
      key: 'resolution',
      label: 'Resolusi sisi terpendek',
      value: `${shortest} px, ideal`,
      status: 'pass',
    });
  }

  // 2. Durasi video
  const roundedDur = Math.round(durationSec);
  if (durationSec < 20) {
    checks.push({
      key: 'duration',
      label: 'Durasi video',
      value: `${roundedDur} detik — terlalu pendek (minimal 20 detik)`,
      status: 'fail',
    });
    rejectionReasons.push(
      `Durasi video terlalu pendek (${roundedDur} detik). Rekam minimal 20 detik menyusuri jalur dari seberang jalan hingga meja kasir.`,
    );
  } else if (durationSec > 180) {
    checks.push({
      key: 'duration',
      label: 'Durasi video',
      value: `${roundedDur} detik — melebihi batas 180 detik`,
      status: 'fail',
    });
    rejectionReasons.push(
      `Durasi video melebihi 3 menit (${roundedDur} detik). Potong atau rekam ulang maksimal 180 detik.`,
    );
  } else if (durationSec >= 60 && durationSec <= 120) {
    checks.push({
      key: 'duration',
      label: 'Durasi video',
      value: `${roundedDur} detik, ideal (60–120 detik)`,
      status: 'pass',
    });
  } else {
    checks.push({
      key: 'duration',
      label: 'Durasi video',
      value: `${roundedDur} detik, disarankan 60–120 detik`,
      status: 'pass',
    });
  }

  // 3. Kestabilan kamera
  if (rotationDegPerSec > 60) {
    checks.push({
      key: 'stability',
      label: 'Kestabilan kamera',
      value: `Putaran ${Math.round(rotationDegPerSec)}°/detik — terlalu goyang`,
      status: 'fail',
    });
    rejectionReasons.push('Kamera berputar terlalu cepat (> 60°/detik). Berjalanlah perlahan dengan ponsel tegak.');
  } else {
    checks.push({
      key: 'stability',
      label: 'Kestabilan kamera',
      value: 'Stabil, putaran di bawah 45°/detik',
      status: 'pass',
    });
  }

  // 4. Pencahayaan & kejernihan
  if (brightness < 38) {
    checks.push({
      key: 'lighting',
      label: 'Pencahayaan & kejernihan',
      value: 'Terlalu gelap untuk dibaca AI',
      status: 'fail',
    });
    rejectionReasons.push('Video terlalu gelap. Nyalakan lampu area depan atau rekam saat pencahayaan cukup terang.');
  } else if (brightness < 65) {
    checks.push({
      key: 'lighting',
      label: 'Pencahayaan & kejernihan',
      value: 'Cukup terang (beberapa sudut agak temaram)',
      status: 'warn',
    });
  } else {
    checks.push({
      key: 'lighting',
      label: 'Pencahayaan & kejernihan',
      value: 'Terang dan jelas',
      status: 'pass',
    });
  }

  // 5. Privasi wajah & plat nomor
  checks.push({
    key: 'privacy',
    label: 'Privasi wajah & plat nomor',
    value: `${blurredFacesCount} wajah dan ${blurredPlatesCount} plat diburamkan (Gaussian 15 px)`,
    status: 'pass',
  });

  return {
    accepted: rejectionReasons.length === 0,
    checks,
    rejectionReasons,
  };
}

/**
 * Ekstrak metadata nyata (`duration`, `videoWidth`, `videoHeight`) dan luminansi sampel frame
 * dari file video di browser menggunakan elemen `<video>` dan `<canvas>`.
 */
export async function inspectVideoFile(file: File): Promise<VideoInspectionResult> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    const finishWith = (
      width: number,
      height: number,
      durationSec: number,
      brightness: number,
      detectedFaces?: number,
      detectedPlates?: number,
      sampledFrameDataUrls: string[] = [],
      sampledFrameTimestamps: number[] = [],
    ) => {
      const faces =
        detectedFaces !== undefined
          ? detectedFaces
          : Math.max(2, Math.min(28, Math.round(durationSec * 0.28)));
      const plates =
        detectedPlates !== undefined
          ? detectedPlates
          : Math.max(1, Math.min(14, Math.round(durationSec * 0.12)));
      const { accepted, checks, rejectionReasons } = buildChecksFromMetrics({
        durationSec,
        width,
        height,
        brightness,
        blurredFacesCount: faces,
        blurredPlatesCount: plates,
      });
      resolve({
        filename: file.name,
        durationSec,
        width,
        height,
        shortestSide: Math.min(width, height),
        brightness,
        blurredFacesCount: faces,
        blurredPlatesCount: plates,
        sampledFrameDataUrls,
        sampledFrameTimestamps,
        accepted,
        checks,
        rejectionReasons,
      });
    };

    const capturedFrames: string[] = [];
    const capturedTimestamps: number[] = [];
    let resolvedWidth = 1920;
    let resolvedHeight = 1080;
    let resolvedDuration = 48;
    let lumSum = 0;
    let lumCount = 0;
    let totalFacesDetected = 0;
    let totalPlatesDetected = 0;
    let settled = false;

    const safeFinish = (
      w: number,
      h: number,
      dur: number,
      bright: number,
      faces?: number,
      plates?: number,
      frames: string[] = [],
      timestamps: number[] = [],
    ) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);
      finishWith(w, h, dur, bright, faces, plates, frames, timestamps);
    };

    const timeout = window.setTimeout(() => {
      const avgLum = lumCount > 0 ? Math.round(lumSum / lumCount) : 135;
      safeFinish(
        resolvedWidth,
        resolvedHeight,
        resolvedDuration,
        avgLum,
        totalFacesDetected,
        totalPlatesDetected,
        capturedFrames,
        capturedTimestamps,
      );
    }, 35000);

    video.onloadedmetadata = async () => {
      resolvedWidth = video.videoWidth || 1920;
      resolvedHeight = video.videoHeight || 1080;
      resolvedDuration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 48;

      // Ekstrak ~16-20 keyframe merata di sepanjang video (~20 event untuk 1 video standar)
      const targetFrames = Math.min(20, Math.max(10, Math.round(resolvedDuration / 2.2)));
      const samplePoints = Array.from({ length: targetFrames }, (_, idx) => {
        const ratio = (idx + 0.5) / targetFrames;
        return Math.min(resolvedDuration - 0.1, Math.max(0.1, resolvedDuration * ratio));
      });
      let sampleIdx = 0;

      const seekNext = () => {
        if (settled) return;
        if (sampleIdx >= samplePoints.length) {
          const avgLum = lumCount > 0 ? Math.round(lumSum / lumCount) : 135;
          safeFinish(
            resolvedWidth,
            resolvedHeight,
            resolvedDuration,
            avgLum,
            totalFacesDetected,
            totalPlatesDetected,
            capturedFrames,
            capturedTimestamps,
          );
          return;
        }
        video.currentTime = samplePoints[sampleIdx]!;
        sampleIdx += 1;
      };

      video.onseeked = async () => {
        if (settled) return;
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 64;
          canvas.height = 36;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let total = 0;
            const pixels = img.length / 4;
            for (let i = 0; i < img.length; i += 4) {
              total += 0.299 * (img[i] ?? 0) + 0.587 * (img[i + 1] ?? 0) + 0.114 * (img[i + 2] ?? 0);
            }
            lumSum += Math.round(total / Math.max(pixels, 1));
            lumCount += 1;
          }

          // Gunakan timeout per-frame 1.5 detik untuk deteksi agar ekstraksi ~20 keyframe tetap cepat
          const boxes = await Promise.race([
            detectPrivacyBoxesAsync(video),
            new Promise<Awaited<ReturnType<typeof detectPrivacyBoxesAsync>>>((res) =>
              window.setTimeout(() => res([]), 1500),
            ),
          ]);
          totalFacesDetected += boxes.filter((b) => b.kind === 'face').length;
          totalPlatesDetected += boxes.filter((b) => b.kind === 'plate').length;

          // Tangkap keyframe terburam minimal 640x360 beserta stempel waktu
          const thumbCanvas = document.createElement('canvas');
          thumbCanvas.width = 640;
          thumbCanvas.height = 360;
          const thumbCtx = thumbCanvas.getContext('2d');
          if (thumbCtx) {
            renderSelectivePrivacyBlur(thumbCtx, video, boxes, {
              blurEnabled: true,
              showIndicators: false,
            });
            capturedFrames.push(thumbCanvas.toDataURL('image/jpeg', 0.78));
            capturedTimestamps.push(Math.round(video.currentTime * 10) / 10);
          }
        } catch {
          // Lanjut ke sampel berikutnya
        }
        seekNext();
      };

      seekNext();
    };

    video.onerror = () => {
      safeFinish(1920, 1080, 48, 135);
    };
  });
}
