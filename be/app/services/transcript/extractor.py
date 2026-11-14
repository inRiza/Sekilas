"""F3: Ekstraksi transkrip kejadian dari rangkaian keyframe terburam menggunakan Gemini Multimodal."""

from __future__ import annotations

import base64
import logging
from uuid import uuid4

import httpx

from app.models.entities import Analysis as AnalysisModel
from app.models.entities import TranscriptCheckpoint, TranscriptSegment
from app.services.llm.router import KeyframeInput, LLMUnavailableError, get_llm_router

logger = logging.getLogger(__name__)

VLM_SYSTEM_PROMPT = """Kamu adalah pengamat lapangan yang merekam perjalanan calon pelanggan dari seberang jalan, mendekati pintu masuk, hingga ke meja pesan/kasir sebuah tempat usaha makanan/minuman.

Aturan ketat penulisan transkrip lengkap & mendetail:
1. Kamu HANYA menerima gambar keyframe yang sudah diburamkan beserta stempel waktunya dan satu kalimat jenis usaha.
2. Jangan menebak atau mengarang data di luar gambar (jangan mengarang nama menu, harga, atau jam buka bila tidak terlihat jelas di frame). Namun semua yang TERLIHAT di frame wajib dicatat secara menyeluruh dan persis.
3. Cakup SELURUH durasi video dari detik 0.0 sampai akhir tanpa celah waktu, dan pastikan SEMUA frame [1..N] terpetakan ke dalam segmen berurutan (~15 sampai 20 segmen untuk 1 video standar) dari sudut pandang 'jalan' -> 'pintu' -> 'dalam'.
4. Untuk setiap segmen, tuliskan secara lengkap dan teliti:
   - timestamp_start & timestamp_end (dalam detik, berkesinambungan dari segmen sebelumnya)
   - frame_indices: daftar nomor urut frame [1..N] yang menjadi bukti segmen ini (minimal 1 frame per segmen)
   - vantage: 'jalan' | 'pintu' | 'dalam'
   - zone_id: pengenal zona singkat (mis. 'trotoar_seberang', 'bahu_jalan', 'depan_fasad', 'area_parkir', 'akses_tangga', 'ambang_pintu', 'area_tunggu', 'meja_kasir')
   - narrative: deskripsi LENGKAP & MENDETAIL (2-4 kalimat kaya observasi) mencakup: posisi/jarak pandang kamera, bentuk & warna fasad/bangunan, keberadaan & keterbacaan papan nama/spanduk/neon box (tuliskan teks yang terbaca apa adanya), tanda BUKA/TUTUP & jam buka, kondisi trotoar/parkiran/penghalang (motor, mobil, gerobak, tiang), kondisi pintu/tangga/anak tangga/pegangan, tingkat pencahayaan/silau kaca, visibilitas daftar menu & angka harga, suasana dalam ruangan, serta kejelasan letak meja pesan/kasir, papan QRIS/pembayaran, dan alur antrean.
   - not_visible: daftar spesifik semua isyarat penting yang TIDAK terlihat atau TIDAK terbaca pada titik pandang ini (mis. nama menu, angka harga, tanda buka/tutup, jam operasional, petunjuk arah masuk, area kasir, metode pembayaran). Wajib diisi dengan jelas!
   - confidence: 'stabil' atau 'tidak_pasti' (tandai 'tidak_pasti' bila gambar buram, terlalu gelap, terhalang, atau bergerak terlalu cepat).
5. Jangan menulis ciri pribadi orang (wajah, pelat nomor, pakaian spesifik); sebut hanya sebagai tingkat keramaian jika ada.
6. Kembalikan JSON dengan struktur:
   {
     "segments": [...],
     "checkpoints": [
       {"kind": "terlihat_dari_jalan" | "pintu_atau_tangga" | "penanda_atau_papan" | "menu_dan_harga" | "titik_pesan", "timestamp": number, "segment_index": number}
     ]
   }"""


def _load_keyframe_bytes(frame_key: str) -> bytes | None:
    """Ambil bytes JPEG dari data URL atau URL publik Supabase Storage."""
    if not frame_key:
        return None
    if frame_key.startswith("data:image/"):
        try:
            _, b64 = frame_key.split(",", 1)
            return base64.b64decode(b64)
        except (ValueError, TypeError):
            return None
    if frame_key.startswith(("http://", "https://")):
        try:
            with httpx.Client(timeout=15.0) as http:
                resp = http.get(frame_key)
                if resp.status_code == 200 and resp.content:
                    return resp.content
        except (httpx.HTTPError, OSError) as exc:
            logger.debug("Gagal mengunduh keyframe %s: %s", frame_key, exc)
    return None


def _build_fallback_segments(
    *,
    analysis: AnalysisModel,
    duration_s: float,
    cashier_at_s: float,
    frame_keys: list[str],
    timestamps_s: list[float],
) -> tuple[list[TranscriptSegment], list[TranscriptCheckpoint]]:
    """Fallback deterministik (~12-18 segmen) ketika mode mock atau keyframe belum tersedia."""
    ctx = analysis.context
    biz = analysis.business
    bname = (ctx.business_name if ctx else (biz.name if biz else analysis.name)) or "Tempat Usaha"
    btype = ctx.business_type if ctx and ctx.business_type else "warung makan"
    loc_name = (ctx.location_name if ctx else (biz.location_name if biz else "")) or "pinggir jalan utama"
    loc_desc = (ctx.location_description if ctx and ctx.location_description else "") or "bangunan ruko"

    end_time = max(12.0, min(cashier_at_s or duration_s, duration_s))
    n_events = max(12, min(20, len(frame_keys) if len(frame_keys) >= 8 else 15))
    step = end_time / n_events

    templates = [
        ("jalan", "seberang_jalan", f"Pandangan awal dari seberang {loc_name} ke arah deretan bangunan sekitar {bname}.", "Papan nama dan status buka {bname} belum terbaca dari jarak ini.", "stabil"),
        ("jalan", "trotoar_awal", f"Mulai mendekati sisi jalan depan {bname} ({btype}). Terlihat fasad {loc_desc}.", "Daftar menu maupun harga belum terlihat dari luar.", "stabil"),
        ("jalan", "jalur_parkir", f"Melintasi area bahu jalan dan area parkir depan {bname}.", "Penanda batas parkir khusus pelanggan belum tampak jelas.", "tidak_pasti"),
        ("jalan", "depan_fasad", f"Berada tepat di depan fasad {bname}. Nama tempat mulai terlihat namun ukuran huruf relatif sedang.", "Informasi jam operasional tidak tampak di bagian depan.", "stabil"),
        ("pintu", "akses_luar", f"Mendekati akses pintu masuk {bname}. Pencahayaan luar cukup terang dibanding area dalam.", "Arah masuk atau keterangan dorong/tarik di pintu belum terlihat.", "stabil"),
        ("pintu", "depan_pintu", f"Berhenti tepat di depan pintu/tangga masuk {bname}.", "Daftar menu dan kisaran harga belum terpampang di sisi pintu.", "tidak_pasti"),
        ("pintu", "ambang_pintu", f"Melangkah melewati ambang pintu {bname}, transisi pencahayaan luar ke dalam mulai terasa.", "Petunjuk posisi meja kasir belum terbaca dari ambang pintu.", "stabil"),
        ("dalam", "ruang_depan", f"Memasuki area dalam {bname}. Terlihat penataan meja dan kursi pengunjung.", "Menu unggulan atau promo paket hemat belum terlihat di area awal.", "stabil"),
        ("dalam", "koridor_dalam", f"Menyusuri ruang layanan dalam menuju area pemesanan {bname}.", "Tanda antre khusus pesan atau bayar belum terpasang.", "stabil"),
        ("dalam", "dekat_kasir", f"Mendekati meja kasir {bname}. Area layanan terlihat rapi dan bersih.", "Sebagian keterangan harga ukuran porsi masih kecil.", "stabil"),
        ("dalam", "meja_kasir", f"Tiba di titik pesan dan kasir {bname}. Menu utama dan staf kasir terlihat siap melayani.", "Estimasi waktu penyajian tidak tertulis di papan kasir.", "stabil"),
    ]

    segments: list[TranscriptSegment] = []
    checkpoints: list[TranscriptCheckpoint] = []
    for i in range(n_events):
        t_start = round(i * step, 1)
        t_end = round((i + 1) * step, 1)
        tpl_idx = min(len(templates) - 1, int(i * len(templates) / n_events))
        vantage, zone_id, nar, not_vis, conf = templates[tpl_idx]
        fk = [frame_keys[i]] if i < len(frame_keys) else ([frame_keys[-1]] if frame_keys else [])
        seg_id = f"seg_{uuid4().hex[:8]}"
        segments.append(
            TranscriptSegment(
                id=seg_id,
                analysis_id=analysis.id,
                timestamp_start=t_start,
                timestamp_end=t_end,
                frame_keys=fk,
                vantage=vantage,
                zone_id=zone_id,
                narrative=nar.format(bname=bname),
                not_visible=not_vis.format(bname=bname),
                confidence=conf,
                is_confirmed_by_owner=(conf == "stabil"),
                edited_by_owner=False,
            )
        )
        if i == 0:
            checkpoints.append(TranscriptCheckpoint(id=f"chk_{uuid4().hex[:8]}", analysis_id=analysis.id, kind="terlihat_dari_jalan", timestamp_s=t_start, segment_id=seg_id))
        elif i == n_events // 3:
            checkpoints.append(TranscriptCheckpoint(id=f"chk_{uuid4().hex[:8]}", analysis_id=analysis.id, kind="pintu_atau_tangga", timestamp_s=t_start, segment_id=seg_id))
        elif i == n_events - 1:
            checkpoints.append(TranscriptCheckpoint(id=f"chk_{uuid4().hex[:8]}", analysis_id=analysis.id, kind="titik_pesan", timestamp_s=cashier_at_s or t_end, segment_id=seg_id))

    return segments, checkpoints


def extract_transcript_with_gemini(
    *,
    analysis: AnalysisModel,
    duration_s: float,
    cashier_at_s: float,
    frame_keys: list[str],
    timestamps_s: list[float] | None = None,
) -> tuple[list[TranscriptSegment], list[TranscriptCheckpoint]]:
    """Ekstrak ~15-20 segmen transkrip kejadian dari keyframe terburam via Gemini Multimodal."""
    ts_list = list(timestamps_s or [])
    if len(ts_list) < len(frame_keys):
        step = duration_s / max(1, len(frame_keys))
        ts_list = [round((idx + 0.5) * step, 1) for idx in range(len(frame_keys))]

    router = get_llm_router()
    keyframes: list[KeyframeInput] = []
    valid_frame_keys: list[str] = []
    for idx, fk in enumerate(frame_keys[:20]):
        img_bytes = _load_keyframe_bytes(fk)
        if img_bytes:
            keyframes.append(KeyframeInput(timestamp_s=ts_list[idx] if idx < len(ts_list) else idx * 2.0, image_bytes=img_bytes))
            valid_frame_keys.append(fk)

    if not router.is_mock_mode and keyframes:
        ctx = analysis.context
        btype = ctx.business_type if ctx and ctx.business_type else "tempat makan/minuman"
        # Sesuai PRD F3: VLM hanya menerima 1 kalimat jenis usaha + video/keyframe terburam
        user_prompt = (
            f"Ini tempat makan berjenis {btype}. "
            f"Total durasi video {duration_s:.1f} detik, titik pesan/kasir tercapai pada {cashier_at_s:.1f} detik. "
            f"Analisis SEMUA {len(keyframes)} keyframe berurutan berikut secara menyeluruh dan hasilkan 15 sampai 20 segmen kejadian yang sangat detail (2-4 kalimat per segmen, tanpa melewatkan satu frame pun, mencakup seluruh durasi 0.0 hingga {duration_s:.1f} detik)."
        )
        try:
            res = router.generate_multimodal_json(
                system_prompt=VLM_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                keyframes=keyframes,
                max_output_tokens=8192,
            )
            if res and isinstance(res.data, dict) and isinstance(res.data.get("segments"), list):
                parsed_segments: list[TranscriptSegment] = []
                for idx, raw in enumerate(res.data["segments"]):
                    if not isinstance(raw, dict):
                        continue
                    vantage = raw.get("vantage", "jalan")
                    if vantage not in ("jalan", "pintu", "dalam"):
                        vantage = "jalan"
                    conf = raw.get("confidence", "stabil")
                    if conf not in ("stabil", "tidak_pasti"):
                        conf = "stabil"
                    indices = raw.get("frame_indices") or [idx + 1]
                    seg_frames = [
                        valid_frame_keys[fi - 1]
                        for fi in indices
                        if isinstance(fi, int) and 1 <= fi <= len(valid_frame_keys)
                    ]
                    if not seg_frames:
                        seg_frames = [valid_frame_keys[min(idx, len(valid_frame_keys) - 1)]]
                    parsed_segments.append(
                        TranscriptSegment(
                            id=f"seg_{uuid4().hex[:8]}",
                            analysis_id=analysis.id,
                            timestamp_start=float(raw.get("timestamp_start", 0.0)),
                            timestamp_end=float(raw.get("timestamp_end", duration_s)),
                            frame_keys=seg_frames,
                            vantage=vantage,
                            zone_id=str(raw.get("zone_id") or f"zona_{idx + 1}"),
                            narrative=str(raw.get("narrative") or "").strip(),
                            not_visible=str(raw.get("not_visible") or "Tidak ada catatan tambahan.").strip(),
                            confidence=conf,
                            is_confirmed_by_owner=(conf == "stabil"),
                            edited_by_owner=False,
                        )
                    )
                if parsed_segments:
                    parsed_checkpoints: list[TranscriptCheckpoint] = []
                    for chk in res.data.get("checkpoints") or []:
                        if not isinstance(chk, dict):
                            continue
                        seg_idx = int(chk.get("segment_index", 0))
                        target_seg = parsed_segments[max(0, min(len(parsed_segments) - 1, seg_idx))]
                        kind = str(chk.get("kind") or "terlihat_dari_jalan")
                        parsed_checkpoints.append(
                            TranscriptCheckpoint(
                                id=f"chk_{uuid4().hex[:8]}",
                                analysis_id=analysis.id,
                                kind=kind,
                                timestamp_s=float(chk.get("timestamp", target_seg.timestamp_start)),
                                segment_id=target_seg.id,
                            )
                        )
                    return parsed_segments, parsed_checkpoints
            raise LLMUnavailableError(
                "Respons transkrip Gemini kosong atau tidak valid. Silakan coba lagi.",
                status_code=502,
            )
        except LLMUnavailableError:
            raise
        except (httpx.HTTPError, ValueError, RuntimeError, KeyError, TypeError, OSError) as exc:
            raise LLMUnavailableError(
                f"Ekstraksi transkrip Gemini gagal: {exc}",
                status_code=502,
            ) from exc

    return _build_fallback_segments(
        analysis=analysis,
        duration_s=duration_s,
        cashier_at_s=cashier_at_s,
        frame_keys=frame_keys,
        timestamps_s=ts_list,
    )
