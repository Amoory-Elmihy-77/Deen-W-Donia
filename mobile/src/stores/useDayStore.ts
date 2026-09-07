import { create } from 'zustand';

type DayMode = 'normal' | 'busy' | 'study' | 'deep_work' | 'recovery';

interface DayState {
  date: string;
  wakeTime: string | null;
  sleepTime: string;
  dayMode: DayMode;
  isPlanned: boolean;
  setWakeTime: (time: string) => void;
  setSleepTime: (time: string) => void;
  setDayMode: (mode: DayMode) => void;
  setDate: (date: string) => void;
  setIsPlanned: (planned: boolean) => void;
  resetDay: () => void;
}

function getTodayString(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export const useDayStore = create<DayState>((set) => ({
  date: getTodayString(),
  wakeTime: null,
  sleepTime: '23:00',
  dayMode: 'normal',
  isPlanned: false,

  setWakeTime: (time) => set({ wakeTime: time }),
  setSleepTime: (time) => set({ sleepTime: time }),
  setDayMode: (mode) => set({ dayMode: mode }),
  setDate: (date) => set({ date, wakeTime: null, isPlanned: false, dayMode: 'normal' }),
  setIsPlanned: (planned) => set({ isPlanned: planned }),
  resetDay: () =>
    set({
      date: getTodayString(),
      wakeTime: null,
      isPlanned: false,
      dayMode: 'normal',
    }),
}));
