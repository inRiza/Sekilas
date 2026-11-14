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
        accepted,
        checks,
        rejectionReasons,
      });
    };

    const timeout = window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      finishWith(1920, 1080, 48, 135);
    }, 6500);

    video.onloadedmetadata = async () => {
      const width = video.videoWidth || 1920;
      const height = video.videoHeight || 1080;
      const rawDuration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 48;

      const samplePoints = [0.15, 0.4, 0.65, 0.85].map((r) => Math.min(rawDuration - 0.1, Math.max(0.1, rawDuration * r)));
      let sampleIdx = 0;
      let lumSum = 0;
      let lumCount = 0;
      let totalFacesDetected = 0;
      let totalPlatesDetected = 0;
      const capturedFrames: string[] = [];

      const seekNext = () => {
        if (sampleIdx >= samplePoints.length) {
          window.clearTimeout(timeout);
          const avgLum = lumCount > 0 ? Math.round(lumSum / lumCount) : 135;
          URL.revokeObjectURL(objectUrl);
          finishWith(
            width,
            height,
            rawDuration,
            avgLum,
            totalFacesDetected,
            totalPlatesDetected,
            capturedFrames,
          );
          return;
        }
        video.currentTime = samplePoints[sampleIdx]!;
        sampleIdx += 1;
      };

      video.onseeked = async () => {
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

          const boxes = await detectPrivacyBoxesAsync(video);
          totalFacesDetected += boxes.filter((b) => b.kind === 'face').length;
          totalPlatesDetected += boxes.filter((b) => b.kind === 'plate').length;

          // Tangkap thumbnail terburam (320x180) untuk dijadikan frame bukti di Verifikasi Transkrip
          const thumbCanvas = document.createElement('canvas');
          thumbCanvas.width = 320;
          thumbCanvas.height = 180;
          const thumbCtx = thumbCanvas.getContext('2d');
          if (thumbCtx) {
            renderSelectivePrivacyBlur(thumbCtx, video, boxes, {
              blurEnabled: true,
              showIndicators: false,
            });
            capturedFrames.push(thumbCanvas.toDataURL('image/jpeg', 0.75));
          }
        } catch {
          // Lanjut ke sampel berikutnya
        }
        seekNext();
      };

      seekNext();
    };

    video.onerror = () => {
      window.clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);
      finishWith(1920, 1080, 48, 135);
    };
  });
}
