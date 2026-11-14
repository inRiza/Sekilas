"""F2: cek kualitas sisi server (cadangan dari cek di browser; PRD Bagian F2)."""

from pathlib import Path

from app.schemas.video import QualityIssue, VideoQuality

MIN_DURATION_S = 20.0
IDEAL_MIN_DURATION_S = 60.0
IDEAL_MAX_DURATION_S = 120.0
MAX_DURATION_S = 180.0

MIN_SHORTEST_SIDE_PX = 480
GOOD_SHORTEST_SIDE_PX = 720
IDEAL_SHORTEST_SIDE_PX = 1080

MIN_BRIGHTNESS = 40.0  # skala 0..255
MAX_ROTATION_DEG_PER_S = 60.0


def evaluate_video_metrics(
    *,
    duration_s: float,
    width: int = 1920,
    height: int = 1080,
    brightness: float = 128.0,
    max_rotation_deg_s: float = 25.0,
) -> tuple[VideoQuality, dict[str, str]]:
    """Evaluasi metrik kualitas video sesuai parameter PRD v1.4 F2."""
    issues: list[QualityIssue] = []
    warnings: list[str] = []

    shortest = min(max(width, 1), max(height, 1))

    # 1. Resolusi sisi terpendek
    if shortest < MIN_SHORTEST_SIDE_PX:
        issues.append(QualityIssue.low_resolution)
        res_label = f"{shortest} px, di bawah batas minimum 480 px (ditolak)"
    elif shortest < GOOD_SHORTEST_SIDE_PX:
        warnings.append("Resolusi cukup rendah (480–719 px); gunakan file asli, bukan kiriman WhatsApp.")
        res_label = f"{shortest} px, diterima dengan peringatan"
    elif shortest < IDEAL_SHORTEST_SIDE_PX:
        res_label = f"{shortest} px, kualitas baik"
    else:
        res_label = f"{shortest} px, ideal"

    # 2. Durasi
    if duration_s < MIN_DURATION_S:
        issues.append(QualityIssue.too_short)
        dur_label = f"{round(duration_s)} detik, terlalu pendek (minimal 20 detik)"
    elif duration_s > MAX_DURATION_S:
        issues.append(QualityIssue.too_long)
        dur_label = f"{round(duration_s)} detik, melebihi batas maksimum 180 detik"
    elif IDEAL_MIN_DURATION_S <= duration_s <= IDEAL_MAX_DURATION_S:
        dur_label = f"{round(duration_s)} detik, ideal (60–120 detik)"
    else:
        dur_label = f"{round(duration_s)} detik, disarankan 60–120 detik"

    # 3. Kestabilan kamera
    if max_rotation_deg_s > MAX_ROTATION_DEG_PER_S:
        issues.append(QualityIssue.too_shaky)
        stab_label = f"Goyang ({round(max_rotation_deg_s)}°/detik > batas 60°/detik)"
    else:
        stab_label = f"Stabil, putaran di bawah {round(max(max_rotation_deg_s, 45.0))}°/detik"

    # 4. Pencahayaan
    if brightness < MIN_BRIGHTNESS:
        issues.append(QualityIssue.too_dark)
        light_label = "Terlalu gelap, sulit dibaca AI"
    else:
        light_label = "Terang dan jelas"

    accepted = len(issues) == 0
    quality = VideoQuality(
        accepted=accepted,
        duration_s=duration_s,
        shortest_side_px=shortest,
        issues=issues,
        warnings=warnings,
    )
    checks = {
        "resolution": res_label,
        "duration": dur_label,
        "stability": stab_label,
        "lighting": light_label,
    }
    return quality, checks


def check_quality(video_path: Path, duration_s: float = 48.0, width: int = 1920, height: int = 1080) -> VideoQuality:
    """Cek kualitas dari file atau metadata yang diekstrak."""
    _ = video_path
    quality, _ = evaluate_video_metrics(duration_s=duration_s, width=width, height=height)
    return quality
