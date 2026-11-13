import { MeasurementPlanData } from '@/types/api';

export const MOCK_MEASUREMENT_PLAN: MeasurementPlanData = {
  analysis_id: 'selasar-kopi',
  business_name: 'Warung Kopi & Roti Selasar',
  observation_title: 'Rencana Pengukuran Lapangan: Titik Gesekan Kaki Tangga',
  observation_spot: 'Berdiri di area trotoar teduh persis 3 meter di depan kaki tangga ruko (sebelah minimarket).',
  recommended_times: [
    'Jam Makan Siang: 12.00 – 13.00 WIB',
    'Jam Pulang Kerja / Kuliah: 17.30 – 18.30 WIB',
  ],
  suggested_duration_minutes: 30,
  metrics: [
    {
      id: 'm_1',
      stage_name: '1. Menoleh / Memperlambat Langkah',
      physical_cue: 'Pejalan kaki atau pengendara yang menoleh ke arah plang lantai 2 saat melintas.',
      target_count: 50,
    },
    {
      id: 'm_2',
      stage_name: '2. Mendekati Kaki Tangga',
      physical_cue: 'Orang yang berjalan mendekat ke lorong tangga dan tampak melihat ke arah lantai 2.',
      target_count: 25,
    },
    {
      id: 'm_3',
      stage_name: '3. Berbalik / Batal Naik',
      physical_cue: 'Orang yang sempat berhenti di depan tangga tetapi kemudian membatalkan niat dan pergi.',
      target_count: 15,
    },
    {
      id: 'm_4',
      stage_name: '4. Berhasil Menaiki Tangga',
      physical_cue: 'Orang yang melangkah menaiki tangga sampai ke lantai 2.',
      target_count: 10,
    },
  ],
  practical_tips: [
    'Posisikan diri senatural mungkin agar tidak membuat calon pembeli merasa diawasi.',
    'Lakukan tally selama 30 menit tanpa gangguan smartphone.',
    'Bandingkan rasio orang yang membatalkan niat sebelum dan sesudah banner menu dipasang.',
  ],
};
