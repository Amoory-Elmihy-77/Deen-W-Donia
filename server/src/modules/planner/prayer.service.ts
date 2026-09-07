/**
 * Prayer Times Calculator using the adhan library (v2 API).
 * PrayerTimes constructor accepts a plain Date object directly.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const adhan = require('adhan') as typeof import('adhan');

export interface PrayerTimesResult {
  fajr: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}

type CalcMethodFn = () => import('adhan').CalculationParameters;

const METHOD_MAP: Record<string, CalcMethodFn> = {
  Egypt: () => adhan.CalculationMethod.Egyptian(),
  Egyptian: () => adhan.CalculationMethod.Egyptian(),
  MWL: () => adhan.CalculationMethod.MuslimWorldLeague(),
  MuslimWorldLeague: () => adhan.CalculationMethod.MuslimWorldLeague(),
  ISNA: () => adhan.CalculationMethod.NorthAmerica(),
  NorthAmerica: () => adhan.CalculationMethod.NorthAmerica(),
  MoonsightingCommittee: () => adhan.CalculationMethod.MoonsightingCommittee(),
  Karachi: () => adhan.CalculationMethod.Karachi(),
  UmmAlQura: () => adhan.CalculationMethod.UmmAlQura(),
  Dubai: () => adhan.CalculationMethod.Dubai(),
  Qatar: () => adhan.CalculationMethod.Qatar(),
  Kuwait: () => adhan.CalculationMethod.Kuwait(),
  Singapore: () => adhan.CalculationMethod.Singapore(),
  Turkey: () => adhan.CalculationMethod.Turkey(),
};

export function calculatePrayerTimes(
  latitude: number,
  longitude: number,
  date: Date,
  calculationMethod = 'Egypt'
): PrayerTimesResult {
  const coords = new adhan.Coordinates(latitude, longitude);
  const methodFn = METHOD_MAP[calculationMethod] ?? METHOD_MAP['Egypt'];
  const params = methodFn();
  const pt = new adhan.PrayerTimes(coords, date, params);

  return {
    fajr: pt.fajr,
    dhuhr: pt.dhuhr,
    asr: pt.asr,
    maghrib: pt.maghrib,
    isha: pt.isha,
  };
}

/**
 * Converts a prayer anchor string to a concrete timestamp.
 * Buffer: 5 minutes after prayer for "after_X" anchors.
 */
export function anchorToTimestamp(
  anchor: string,
  prayerTimes: PrayerTimesResult,
  wakeTime: Date,
  sleepTime: Date
): Date {
  const BUFFER_MS = 5 * 60 * 1000;

  switch (anchor) {
    case 'after_fajr':
      return new Date(prayerTimes.fajr.getTime() + BUFFER_MS);
    case 'after_dhuhr':
      return new Date(prayerTimes.dhuhr.getTime() + BUFFER_MS);
    case 'before_asr':
      return new Date(prayerTimes.asr.getTime() - 30 * 60 * 1000);
    case 'after_asr':
      return new Date(prayerTimes.asr.getTime() + BUFFER_MS);
    case 'after_maghrib':
      return new Date(prayerTimes.maghrib.getTime() + BUFFER_MS);
    case 'after_isha':
      return new Date(prayerTimes.isha.getTime() + BUFFER_MS);
    case 'before_sleep':
      return new Date(sleepTime.getTime() - 60 * 60 * 1000);
    default:
      return wakeTime;
  }
}
