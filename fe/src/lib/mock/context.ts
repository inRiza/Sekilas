import { BusinessContext } from '@/types/api';

export const MOCK_CONTEXT: BusinessContext = {
  business_type: 'kedai',
  business_name: 'Warung Kopi & Roti Selasar',
  location_name: 'Jl. Kaliurang KM 5, Gang Megatruh No. 12',
  location_lat: -7.7654,
  location_lng: 110.3789,
  location_description: 'Lantai 2 ruko warna abu-abu, tangga naik berada persis di sebelah minimarket',
  surroundings_type: 'dekat_kampus',
  passersby: ['mahasiswa', 'pekerja_kantor', 'pengendara'],
  business_goal: 'lebih_banyak_pembeli_baru',
  fixed_constraints: ['lokasi', 'fasad'],
  menu_items: [
    { id: 'm1', name: 'Es Kopi Susu Selasar', price: 18000 },
    { id: 'm2', name: 'Roti Panggang Cokelat Keju', price: 15000 },
    { id: 'm3', name: 'Americano Dingin', price: 16000 },
    { id: 'm4', name: 'Nasi Kulit Sambal Korek', price: 24000 },
    { id: 'm5', name: 'Matcha Latte', price: 22000 },
  ],
  calculated_price_level: 'hemat',
  opening_hours: {
    open: '08:00',
    close: '23:00',
  },
  rush_hours: [
    { start: '12:00', end: '14:00' },
    { start: '19:00', end: '21:30' },
  ],
  nearby_competitors: 'Sebelah kiri ada minimarket, seberang jalan ada kafe besar 3 lantai yang ramai mahasiswa',
};
