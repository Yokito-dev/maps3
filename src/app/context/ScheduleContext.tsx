'use client';

import { createContext, useContext, useState } from 'react';

export interface ScheduleItem {
  id: number;
  up3: string;
  ulp: string;
  namaGardu: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'Open' | 'Close';
}

type ScheduleContextType = {
  schedules: ScheduleItem[];
  addSchedule: (item: ScheduleItem) => void;
};

const ScheduleContext = createContext<ScheduleContextType | null>(null);

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);

  const addSchedule = (item: ScheduleItem) => {
    setSchedules(prev => [...prev, item]);
  };

  return (
    <ScheduleContext.Provider value={{ schedules, addSchedule }}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const ctx = useContext(ScheduleContext);
  if (!ctx) {
    throw new Error('useSchedule must be used inside ScheduleProvider');
  }
  return ctx;
}
