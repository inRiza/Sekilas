/** Tahap pipeline Visual Twin lokal, urut sesuai baris log twin/scripts/local_twin.sh. */
export const LOCAL_STAGES = [
  "Ekstraksi frame",
  "Ekstraksi fitur",
  "Pencocokan antar-frame",
  "Rekonstruksi 3D",
  "Ekspor",
  "Tampilan realistis (splat)",
] as const;
