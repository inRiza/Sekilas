/**
 * Ikon aplikasi: semuanya dari Lucide (https://lucide.dev), dengan ketebalan garis seragam.
 * Nama ekspor lama (…Icon) dipertahankan agar pemakaian di halaman tidak perlu diubah.
 * Untuk ikon baru, impor langsung dari 'lucide-react'.
 */
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  FileText,
  History,
  Info,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  type LucideIcon,
  type LucideProps,
  PanelLeft,
  Plus,
  Printer,
  RefreshCw,
  Settings,
  Store,
  TrendingDown,
  TrendingUp,
  Users,
  Video,
  X,
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
export const CheckIcon = withDefaults(Check, 'CheckIcon');
export const PlusIcon = withDefaults(Plus, 'PlusIcon');
export const PrinterIcon = withDefaults(Printer, 'PrinterIcon');
export const RefreshIcon = withDefaults(RefreshCw, 'RefreshIcon');
export const VideoIcon = withDefaults(Video, 'VideoIcon');
export const StoreIcon = withDefaults(Store, 'StoreIcon');
export const BuildingIcon = withDefaults(Building2, 'BuildingIcon');
export const LayoutGridIcon = withDefaults(LayoutGrid, 'LayoutGridIcon');
export const LayoutDashboardIcon = withDefaults(LayoutDashboard, 'LayoutDashboardIcon');
export const UsersIcon = withDefaults(Users, 'UsersIcon');
export const FileTextIcon = withDefaults(FileText, 'FileTextIcon');
export const ChevronRightIcon = withDefaults(ChevronRight, 'ChevronRightIcon');
export const ChevronDownIcon = withDefaults(ChevronDown, 'ChevronDownIcon');
export const SettingsIcon = withDefaults(Settings, 'SettingsIcon');
export const XIcon = withDefaults(X, 'XIcon');
export const LogOutIcon = withDefaults(LogOut, 'LogOutIcon');
export const PanelLeftIcon = withDefaults(PanelLeft, 'PanelLeftIcon');
export const ChevronsUpDownIcon = withDefaults(ChevronsUpDown, 'ChevronsUpDownIcon');
export const HistoryIcon = withDefaults(History, 'HistoryIcon');

export const InfoIcon = withDefaults(Info, 'InfoIcon');
export const TrendingUpIcon = withDefaults(TrendingUp, 'TrendingUpIcon');
export const TrendingDownIcon = withDefaults(TrendingDown, 'TrendingDownIcon');
