/**
 * Ikon aplikasi: semuanya dari Lucide (https://lucide.dev), dengan ketebalan garis seragam.
 * Nama ekspor lama (…Icon) dipertahankan agar pemakaian di halaman tidak perlu diubah.
 * Untuk ikon baru, impor langsung dari 'lucide-react'.
 */
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  FileText,
  Info,
  LayoutGrid,
  LogOut,
  type LucideIcon,
  type LucideProps,
  PanelLeft,
  Plus,
  Settings,
  Store,
  TrendingUp,
} from 'lucide-react';
import React from 'react';

export type IconProps = LucideProps;

const STROKE = 1.75;

function withDefaults(Icon: LucideIcon, name: string) {
  function AppIcon({ size = 16, strokeWidth = STROKE, ...props }: IconProps) {
    return <Icon size={size} strokeWidth={strokeWidth} aria-hidden {...props} />;
  }
  AppIcon.displayName = name;
  return AppIcon;
}

export const ArrowLeftIcon = withDefaults(ArrowLeft, 'ArrowLeftIcon');
export const ArrowRightIcon = withDefaults(ArrowRight, 'ArrowRightIcon');
export const PlusIcon = withDefaults(Plus, 'PlusIcon');
export const StoreIcon = withDefaults(Store, 'StoreIcon');
export const LayoutGridIcon = withDefaults(LayoutGrid, 'LayoutGridIcon');
export const FileTextIcon = withDefaults(FileText, 'FileTextIcon');
export const ChevronRightIcon = withDefaults(ChevronRight, 'ChevronRightIcon');
export const SettingsIcon = withDefaults(Settings, 'SettingsIcon');
export const LogOutIcon = withDefaults(LogOut, 'LogOutIcon');
export const PanelLeftIcon = withDefaults(PanelLeft, 'PanelLeftIcon');
export const InfoIcon = withDefaults(Info, 'InfoIcon');
export const TrendingUpIcon = withDefaults(TrendingUp, 'TrendingUpIcon');
