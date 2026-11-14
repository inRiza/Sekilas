import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProcessingJob } from '@/lib/api/crud';
import type { TranscriptSegment } from '@/types/api';

const mockRouter = { push: vi.fn(), replace: vi.fn() };
const mockSearchParams = new URLSearchParams('analysisId=anl_proses_1');

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/components/brand/mascot', () => ({
  SekilasMascot: () => <div data-testid="mascot-stub">Mascot</div>,
}));

vi.mock('@/lib/use-twin', () => ({
  TWIN_STAGES: ['Mengunggah video', 'Membangun 3D', 'Selesai'],
  useTwin: () => ({ twin: null, error: null }),
}));

const mockFetchProcessingStatus = vi.fn<() => Promise<ProcessingJob | null>>();
const mockFetchTranscriptSegments = vi.fn<() => Promise<TranscriptSegment[]>>();

vi.mock('@/lib/api/crud', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/crud')>();
  return {
    ...actual,
    fetchProcessingStatus: () => mockFetchProcessingStatus(),
    fetchTranscriptSegments: () => mockFetchTranscriptSegments(),
  };
});

import ProsesPage from '@/app/business/analysis/proses/page';

describe('ProsesPage honest queued default status', () => {
  beforeEach(() => {
    mockFetchProcessingStatus.mockReset();
    mockFetchTranscriptSegments.mockReset();
  });

  it('shows 0% progress instead of false 100% while processing job is queued', async () => {
    mockFetchProcessingStatus.mockResolvedValue({
      status: 'queued',
      progress: 0.0,
      stage: 'Menunggu proses transkrip video dimulai',
      message: 'Transkrip video belum berjalan.',
    });
    mockFetchTranscriptSegments.mockResolvedValue([]);

    render(<ProsesPage />);

    await waitFor(() => {
      expect(screen.getByText('Menunggu proses transkrip video dimulai…')).toBeInTheDocument();
    });
    expect(screen.getAllByText('0%').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('100%')).not.toBeInTheDocument();
  });
});
