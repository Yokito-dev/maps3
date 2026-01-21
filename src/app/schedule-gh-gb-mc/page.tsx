'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { IoArrowBack } from 'react-icons/io5';
import plnKecil from '@/app/assets/plnup3/plnkecil.svg';
import { useSchedule } from '@/app/context/ScheduleContext';

/* ================= TYPES ================= */

interface CalendarEvent {
  id: number;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  color: string;
}

/* ================= PAGE ================= */

export default function SchedulePage() {
  const router = useRouter();
  const { schedules } = useSchedule();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  /* ================= TRANSFORM CONTEXT → EVENTS ================= */

  const events: CalendarEvent[] = schedules.map((s) => ({
    id: s.id,
    title: `${s.up3} - ${s.namaGardu}`,
    date: new Date(s.date),
    startTime: s.startTime,
    endTime: s.endTime,
    color: s.status === 'Open' ? '#14b8a6' : '#ef4444',
  }));

  /* ================= CONSTANTS ================= */

  const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const hariPendek = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const hariGrid = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  /* ================= HELPERS ================= */

  const sameDay = (a: Date | null, b: Date | null) =>
    a && b && a.toDateString() === b.toDateString();

  const getEvents = (d: Date | null) =>
    d
      ? events
          .filter(e => sameDay(e.date, d))
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
      : [];

  const getDaysInMonth = (d: Date) => {
    const y = d.getFullYear();
    const m = d.getMonth();
    const first = new Date(y, m, 1).getDay();
    const total = new Date(y, m + 1, 0).getDate();
    return [
      ...Array(first).fill(null),
      ...Array.from({ length: total }, (_, i) => new Date(y, m, i + 1)),
    ];
  };

  const weekDates = (d: Date) =>
    Array.from({ length: 7 }, (_, i) => {
      const x = new Date(d);
      x.setDate(d.getDate() - d.getDay() + i);
      return x;
    });

  const timeSlots = Array.from({ length: 24 }, (_, h) => ({
    txt: `${h === 0 ? 12 : h > 12 ? h - 12 : h} ${h < 12 ? 'AM' : 'PM'}`,
  }));

  const move = (n: number, unit: 'Date' | 'Month') => {
    const d = new Date(currentDate);
    d[`set${unit}`](d[`get${unit}`]() + n);
    setCurrentDate(d);
    setSelectedDate(d);
  };

  const title = () => {
    if (view === 'month') {
      return `${bulan[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    if (view === 'week') {
      const w = weekDates(currentDate);
      return `${w[0].getDate()} ${bulan[w[0].getMonth()]} – ${w[6].getDate()} ${bulan[w[6].getMonth()]}`;
    }
    const d = selectedDate || currentDate;
    return `${hariPendek[d.getDay()]}, ${d.getDate()} ${bulan[d.getMonth()]}`;
  };

  const pos = (s: string, e: string) => {
    const [sh, sm] = s.split(':').map(Number);
    const [eh, em] = e.split(':').map(Number);
    const st = sh * 60 + sm;
    const en = eh * 60 + em;
    return {
      top: (st / 60) * 64,
      height: Math.max(((en - st) / 60) * 64, 48),
    };
  };

  const days = getDaysInMonth(currentDate);

  /* ================= RENDER ================= */

  return (
    <div className="h-screen w-screen bg-gray-50 overflow-hidden flex flex-col">

      {/* HEADER */}
      <div className="px-4 pt-4 shrink-0">
        <div className="max-w-[1600px] mx-auto">
          <div className="bg-white rounded-full shadow px-6 py-3 flex items-center gap-4">
            <button
              onClick={() => router.push('/menu')}
              className="w-11 h-11 rounded-full hover:bg-gray-200 flex items-center justify-center"
            >
              <IoArrowBack size={24} />
            </button>
            <Image src={plnKecil} alt="PLN" width={40} height={40} />
            <h1 className="text-lg font-medium">Schedule GH GB MC</h1>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-4 pt-4 flex flex-col flex-1 overflow-hidden">

        {/* CONTROLS */}
        <div className="bg-white border rounded-lg mb-4">
          <div className="flex justify-between px-6 py-4">
            <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
              {['day', 'week', 'month'].map(v => (
                <button
                  key={v}
                  onClick={() => setView(v as any)}
                  className={`px-5 py-2 rounded-md text-sm font-semibold ${
                    view === v ? 'bg-white text-sky-600 shadow' : 'text-gray-600'
                  }`}
                >
                  {v === 'day' ? 'Hari' : v === 'week' ? 'Minggu' : 'Bulan'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => move(view === 'month' ? -1 : -7, view === 'month' ? 'Month' : 'Date')}>
                <ChevronLeft />
              </button>
              <div className="min-w-[240px] text-center font-semibold">
                {title()}
              </div>
              <button onClick={() => move(view === 'month' ? 1 : 7, view === 'month' ? 'Month' : 'Date')}>
                <ChevronRight />
              </button>
            </div>
          </div>
        </div>

        {/* MONTH VIEW */}
        {view === 'month' && (
          <div className="bg-white border rounded-lg flex-1 overflow-y-auto">
            <div className="grid grid-cols-7 bg-gray-50 border-b">
              {hariGrid.map(h => (
                <div key={h} className="py-3 text-center text-xs font-bold">
                  {h}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {days.map((d, i) => (
                <div
                  key={i}
                  onClick={() => d && (setSelectedDate(d), setView('day'))}
                  className={`min-h-28 border p-2 ${
                    d ? 'cursor-pointer hover:bg-gray-50' : 'bg-gray-50/50'
                  }`}
                >
                  {d && (
                    <>
                      <div className="font-semibold mb-1">{d.getDate()}</div>
                      {getEvents(d).slice(0, 3).map(e => (
                        <div
                          key={e.id}
                          className="text-xs px-2 py-1 rounded truncate"
                          style={{
                            background: `${e.color}15`,
                            color: e.color,
                            borderLeft: `3px solid ${e.color}`,
                          }}
                        >
                          {e.title}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WEEK VIEW */}
{view === 'week' && (
  <div className="bg-white border rounded-lg flex-1 overflow-hidden">
    {/* Week Header */}
    <div className="grid grid-cols-8 border-b bg-gray-50">
      <div className="w-20" />
      {weekDates(currentDate).map((d, i) => (
        <div
          key={i}
          className="py-3 text-center text-sm font-semibold border-l"
        >
          {hariPendek[d.getDay()]} <br />
          <span className="text-xs font-normal">{d.getDate()}</span>
        </div>
      ))}
    </div>

    {/* Time Grid */}
    <div className="relative overflow-y-auto h-full">
      {timeSlots.map((t, i) => (
        <div key={i} className="flex">
          <div className="w-20 text-xs text-right px-3 py-4 bg-gray-50 border-r">
            {t.txt}
          </div>
          {weekDates(currentDate).map((_, j) => (
            <div key={j} className="flex-1 h-16 border-b border-l" />
          ))}
        </div>
      ))}

      {/* Events */}
      <div className="absolute left-20 right-0 top-0 grid grid-cols-7">
        {weekDates(currentDate).map((d, dayIndex) => (
          <div key={dayIndex} className="relative">
            {getEvents(d).map(e => {
              const p = pos(e.startTime, e.endTime);
              return (
                <div
                  key={e.id}
                  className="absolute left-1 right-1 rounded-lg p-2 text-xs"
                  style={{
                    top: p.top,
                    height: p.height,
                    background: `${e.color}15`,
                    borderLeft: `4px solid ${e.color}`,
                  }}
                >
                  <div className="font-semibold truncate">{e.title}</div>
                  <div>{e.startTime} – {e.endTime}</div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  </div>
)}


        {/* DAY VIEW */}
        {view === 'day' && (
          <div className="bg-white border rounded-lg flex-1 overflow-hidden">
            <div className="border-b px-6 py-3 bg-gray-50 font-semibold">
              {hariPendek[(selectedDate || currentDate).getDay()]}
            </div>

            <div className="relative overflow-y-auto h-full">
              {timeSlots.map((t, i) => (
                <div key={i} className="flex">
                  <div className="w-20 text-xs text-right px-3 py-4 bg-gray-50 border-r">
                    {t.txt}
                  </div>
                  <div className="flex-1 h-16 border-b" />
                </div>
              ))}

              <div className="absolute left-20 right-0 top-0">
                {getEvents(selectedDate || currentDate).map(e => {
                  const p = pos(e.startTime, e.endTime);
                  return (
                    <div
                      key={e.id}
                      className="absolute left-2 right-2 rounded-lg p-3"
                      style={{
                        top: p.top,
                        height: p.height,
                        background: `${e.color}15`,
                        borderLeft: `4px solid ${e.color}`,
                      }}
                    >
                      <div className="font-bold text-sm">{e.title}</div>
                      <div className="text-xs">
                        {e.startTime} – {e.endTime}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ADD BUTTON */}
      <button
        onClick={() => router.push('/schedule-gh-gb-mc/GHGBMC-Form')}
        className="fixed bottom-8 right-8 w-14 h-14 bg-cyan-500 text-white rounded-full shadow-lg flex items-center justify-center"
      >
        <Plus size={26} />
      </button>
    </div>
  );
}
