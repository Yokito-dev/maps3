'use client';
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { IoArrowBack } from 'react-icons/io5';
import plnKecil from '@/app/assets/plnup3/plnkecil.svg';

interface Event {
  id: number; title: string; date: Date;
  startTime: string; endTime: string;
  location?: string; assignee?: string;
  color: string; description?: string;
}

export default function SchedulePage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const events: Event[] = [
    { id: 1, title: 'Site Inspection', date: new Date(2026, 0, 6), startTime: '09:00', endTime: '11:00', color: '#14b8a6' },
    { id: 2, title: 'Team Meeting', date: new Date(2026, 0, 6), startTime: '14:00', endTime: '15:30', color: '#3b82f6' },
    { id: 3, title: 'Client Presentation', date: new Date(2026, 0, 8), startTime: '10:00', endTime: '12:00', color: '#8b5cf6' },
    { id: 4, title: 'Equipment Check', date: new Date(2026, 0, 13), startTime: '08:00', endTime: '09:30', color: '#f59e0b' },
    { id: 5, title: 'Training Session', date: new Date(2026, 0, 13), startTime: '13:00', endTime: '16:00', color: '#ec4899' }
  ];

  const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const hariPendek = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const hariGrid = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const getDaysInMonth = (d: Date) => {
    const y = d.getFullYear(), m = d.getMonth();
    const first = new Date(y, m, 1).getDay();
    const total = new Date(y, m + 1, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: total }, (_, i) => new Date(y, m, i + 1))];
  };

  const sameDay = (a: Date | null, b: Date | null) =>
    a && b && a.toDateString() === b.toDateString();

  const getEvents = (d: Date | null) =>
    d ? events.filter(e => sameDay(e.date, d)).sort((a, b) => a.startTime.localeCompare(b.startTime)) : [];

  const weekDates = (d: Date) =>
    Array.from({ length: 7 }, (_, i) => { const x = new Date(d); x.setDate(d.getDate() - d.getDay() + i); return x; });

  const timeSlots = Array.from({ length: 24 }, (_, h) => ({ h, txt: `${h === 0 ? 12 : h > 12 ? h - 12 : h} ${h < 12 ? 'AM' : 'PM'}` }));

  const move = (n: number, u: 'Date' | 'Month') => {
    const d = new Date(currentDate); d[`set${u}`](d[`get${u}`]() + n);
    setCurrentDate(d); setSelectedDate(d);
  };

  const title = () => {
    if (view === 'month') return `${bulan[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    if (view === 'week') { const w = weekDates(currentDate); return `${w[0].getDate()} ${bulan[w[0].getMonth()]} – ${w[6].getDate()} ${bulan[w[6].getMonth()]}`; }
    const d = selectedDate || currentDate; return `${hariPendek[d.getDay()]}, ${d.getDate()} ${bulan[d.getMonth()]}`;
  };

  const pos = (s: string, e: string) => {
    const [sh, sm] = s.split(':').map(Number), [eh, em] = e.split(':').map(Number);
    const st = sh * 60 + sm, en = eh * 60 + em;
    return { top: (st / 60) * 64, height: Math.max(((en - st) / 60) * 64, 48) };
  };

  const days = getDaysInMonth(currentDate);
  const weeks = weekDates(currentDate);

  return (
    <div className="h-screen w-screen bg-gray-50 overflow-hidden flex flex-col">
      {/* HEADER */}
      <div className="z-30 px-4 pt-4 shrink-0">
        <div className="max-w-[1600px] mx-auto">
          <div className="bg-white rounded-full shadow-lg px-6 py-3 flex items-center gap-4">
            <button onClick={() => router.push('/menu')} className="w-11 h-11 rounded-full hover:bg-gray-200 flex items-center justify-center">
              <IoArrowBack size={24} />
            </button>
            <Image src={plnKecil} alt="PLN" width={40} height={40} />
            <h1 className="text-lg font-medium">Schedule Gardu</h1>
          </div>
        </div>
      </div>

      {/* KONTEN */}
      <div className="w-full px-4 pt-4 pb-0 flex flex-col flex-1 overflow-hidden">
        {/* KONTROL */}
        <div className="bg-white border rounded-lg mb-4 shrink-0">
          <div className="flex justify-between px-6 py-4">
            <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
              {['day', 'week', 'month'].map(v => (
                <button key={v} onClick={() => setView(v as any)}
                  className={`px-5 py-2 rounded-md text-sm font-semibold ${view === v ? 'bg-white text-sky-600 shadow' : 'text-gray-600'}`}>
                  {v === 'day' ? 'Hari' : v === 'week' ? 'Minggu' : 'Bulan'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => move(view === 'month' ? -1 : -7, view === 'month' ? 'Month' : 'Date')}><ChevronLeft /></button>
              <div className="min-w-[240px] text-center font-semibold">{title()}</div>
              <button onClick={() => move(view === 'month' ? 1 : 7, view === 'month' ? 'Month' : 'Date')}><ChevronRight /></button>
            </div>
          </div>
        </div>

        {/* BULAN */}
        {view === 'month' && (
          <div className="bg-white border rounded-lg flex-1 overflow-y-auto">
            <div className="grid grid-cols-7 bg-gray-50 border-b">
              {hariGrid.map((h, i) => <div key={i} className="py-3 text-center text-xs font-bold">{h}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {days.map((d, i) => (
                <div key={i} onClick={() => d && (setSelectedDate(d), setView('day'))}
                  className={`min-h-28 border p-2 ${d ? 'cursor-pointer hover:bg-gray-50' : 'bg-gray-50/50'}`}>
                  {d && <>
                    <div className="font-semibold mb-1">{d.getDate()}</div>
                    {getEvents(d).slice(0, 3).map(e => (
                      <div key={e.id} className="text-xs px-2 py-1 rounded truncate"
                        style={{ background: `${e.color}15`, color: e.color, borderLeft: `3px solid ${e.color}` }}>
                        {e.title}
                      </div>
                    ))}
                  </>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HARI */}
        {view === 'day' && (
          <div className="bg-white border rounded-lg flex-1 overflow-hidden">
            <div className="border-b px-6 py-3 bg-gray-50 font-semibold">
              {hariPendek[(selectedDate || currentDate).getDay()]}
            </div>
            <div className="relative overflow-y-auto h-full">
              {timeSlots.map((t, i) => (
                <div key={i} className="flex">
                  <div className="w-20 text-xs text-right px-3 py-4 bg-gray-50 border-r">{t.txt}</div>
                  <div className="flex-1 h-16 border-b" />
                </div>
              ))}
              <div className="absolute left-20 right-0 top-0">
                {getEvents(selectedDate || currentDate).map(e => {
                  const p = pos(e.startTime, e.endTime);
                  return (
                    <div key={e.id} className="absolute left-2 right-2 rounded-lg p-3"
                      style={{ top: p.top, height: p.height, background: `${e.color}15`, borderLeft: `4px solid ${e.color}` }}>
                      <div className="font-bold text-sm">{e.title}</div>
                      <div className="text-xs">{e.startTime} – {e.endTime}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* MINGGU */}
        {view === 'week' && (
          <div className="bg-white border rounded-lg flex-1 flex flex-col overflow-hidden">

            {/* HEADER */}
            <div className="grid grid-cols-8 bg-gray-50 border-b shrink-0">
              <div />
              {weeks.map((d, i) => (
                <div key={i} className="text-center py-3 border-l">
                  <div className="text-xs font-bold">{hariPendek[d.getDay()]}</div>
                  <div className="text-sm font-bold">{d.getDate()}</div>
                </div>
              ))}
            </div>

            {/* BODY SCROLL */}
            <div className="flex-1 overflow-y-auto">
              {timeSlots.map((t, i) => (
                <div key={i} className="flex">
                  <div className="w-20 text-xs text-right px-3 py-4 bg-gray-50 border-r">
                    {t.txt}
                  </div>
                  {weeks.map((_, j) => (
                    <div key={j} className="flex-1 h-16 border-l border-b" />
                  ))}
                </div>
              ))}
            </div>

          </div>
        )}

      </div>

      {/* ADD */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-teal-500 text-white rounded-full shadow-lg flex items-center justify-center">
        <Plus size={26} />
      </button>
    </div>
  );
}
