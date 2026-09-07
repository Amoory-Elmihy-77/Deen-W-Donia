// Design tokens for دين ودنيا
// Inspired by calm, sacred, and structured aesthetics

export const Colors = {
  // Primary - Deep Teal (wisdom + tranquility)
  primary: '#0D7C66',
  primaryLight: '#1AAE8E',
  primaryDark: '#095E4D',

  // Accent - Warm Gold (Islamic art inspired)
  accent: '#C9A84C',
  accentLight: '#F0CC6E',
  accentDark: '#A07830',

  // Deen (Religion) category - Rich Green
  deen: '#1B6B3A',
  deenLight: '#2E9B56',
  deenBg: '#EAF5EE',

  // Dunya (World) category - Deep Blue
  dunya: '#1B3A6B',
  dunyaLight: '#2E5EA0',
  dunyaBg: '#EAF0F5',

  // Background
  bg: '#F8F9FA',
  bgDark: '#121212',
  surface: '#FFFFFF',
  surfaceDark: '#1E1E1E',
  card: '#FFFFFF',
  cardDark: '#2A2A2A',

  // Text
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textDark: '#F1F1F1',
  textSecondaryDark: '#9CA3AF',

  // Prayer anchors
  fajr: '#8B5CF6',      // Purple - pre-dawn
  dhuhr: '#F59E0B',     // Amber - midday
  asr: '#F97316',       // Orange - afternoon
  maghrib: '#EF4444',   // Red-orange - sunset
  isha: '#3B82F6',      // Blue - night

  // Status
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Borders
  border: '#E5E7EB',
  borderDark: '#374151',

  // Day modes
  normal: '#10B981',
  busy: '#F59E0B',
  study: '#3B82F6',
  deepWork: '#8B5CF6',
  recovery: '#6B7280',
};

export const Typography = {
  // Font families (add to app.json after Expo install)
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    arabic: 'System',
  },

  // Font sizes
  size: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 30,
    '3xl': 36,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
};

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const PrayerColors: Record<string, string> = {
  fajr: Colors.fajr,
  dhuhr: Colors.dhuhr,
  asr: Colors.asr,
  maghrib: Colors.maghrib,
  isha: Colors.isha,
};

export const PrayerEmojis: Record<string, string> = {
  after_fajr: '🌅',
  morning: '☀️',
  after_dhuhr: '🕌',
  afternoon: '🌤️',
  after_asr: '🌇',
  after_maghrib: '🌙',
  after_isha: '⭐',
  before_sleep: '😴',
};

export const DayModeInfo: Record<string, { label: string; labelAr: string; color: string; emoji: string }> = {
  normal: { label: 'Normal', labelAr: 'عادي', color: Colors.normal, emoji: '😊' },
  busy: { label: 'Busy', labelAr: 'مشغول', color: Colors.busy, emoji: '⚡' },
  study: { label: 'Study', labelAr: 'مذاكرة', color: Colors.study, emoji: '📚' },
  deep_work: { label: 'Deep Work', labelAr: 'تركيز عميق', color: Colors.deepWork, emoji: '🎯' },
  recovery: { label: 'Recovery', labelAr: 'راحة', color: Colors.recovery, emoji: '🌿' },
};
