import { Business, UserAccount } from '@/types/api';
import { MOCK_CONTEXT } from './context';

export const CURRENT_USER: UserAccount = {
  id: 'usr_01',
  name: 'Budi Santoso',
  email: 'budi.selasar@gmail.com',
  avatar_url: undefined,
};

export const MOCK_BUSINESSES: Business[] = [
  {
    id: 'biz_selasar_dipatiukur',
    user_id: 'usr_01',
    name: 'Selasar Kopi & Roti',
    branch_name: 'Dipatiukur (Pusat)',
    category: 'kedai',
    address: 'Jl. Dipati Ukur No. 42, Coblong, Bandung',
    primary_analysis_id: 'selasar-kopi',
    context: {
      ...MOCK_CONTEXT,
      business_name: 'Selasar Kopi & Roti',
      location_name: 'Jl. Dipati Ukur No. 42, Coblong, Bandung',
      location_description: 'Lantai 2 ruko warna abu-abu, tangga naik berada persis di sebelah minimarket',
    },
    created_at: '2026-10-01T08:00:00Z',
  },
  {
    id: 'biz_selasar_dago',
    user_id: 'usr_01',
    name: 'Selasar Kopi & Roti',
    branch_name: 'Dago Atas',
    category: 'kafe',
    address: 'Jl. Ir. H. Juanda No. 185, Dago, Bandung',
    primary_analysis_id: 'selasar-dago-eval',
    context: {
      ...MOCK_CONTEXT,
      business_name: 'Selasar Kopi & Roti - Dago',
      location_name: 'Jl. Ir. H. Juanda No. 185, Dago, Bandung',
      location_description: 'Bangunan kaca dengan halaman outdoor di lereng bukit Dago',
      surroundings_type: 'jalan_utama',
    },
    created_at: '2026-11-05T10:30:00Z',
  },
];
