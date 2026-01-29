'use client';
import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { IoArrowBack } from 'react-icons/io5';
import plnKecil from '@/app/assets/plnup3/plnkecil.svg';

/* ================= TYPE ================= */
interface Event {
  id: string;
  ulp: string;
  date: Date;
  color: string;
}

/* ================= API ================= */
const API_URL =
  'https://script.google.com/macros/s/AKfycbyCxXZWyPBCJsyuLZpeynkr6V5FGCsLZopQaUQTPRIMKA6vpXriueq26O1n-SrsK_ALfA/exec';

export default function SchedulePage() {
  const router = useRouter();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<'day' | 'week' | 'month'>('month');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  /* ================= FETCH ================= */
  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoading(true);

        const res = await fetch(API_URL + '?type=schedule');
        const data = await res.json();

        const mapped = data
          .filter((d: any) => d.ulp)
          .map((d: any, i: number) => ({
            id: String(d.id || i),
            ulp: d.ulp,
            date: new Date(d.start_date),
            color: i % 2 === 0 ? '#7dd3fc' : '#86efac',
          }));

        setEvents(mapped);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false); // ⬅️ PENTING
      }
    };

    fetchSchedule();
  }, []);

  /* ================= CONST ================= */
  const bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const hariGrid = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const baseDate = selectedDate || currentDate;

  /* ================= UTILS ================= */
  const sameDay = (a: Date, b: Date) =>
    a.toDateString() === b.toDateString();

  const getEvents = (d: Date) =>
    events.filter(e => sameDay(e.date, d));

  /* ================= MONTH ================= */
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

  const days = getDaysInMonth(currentDate);

  /* ================= WEEK ================= */
  const getWeekStart = (d: Date) => {
    const x = new Date(d);
    x.setDate(d.getDate() - d.getDay());
    return x;
  };

  const weekDates = (d: Date) => {
    const start = getWeekStart(d);
    return Array.from({ length: 7 }, (_, i) => {
      const x = new Date(start);
      x.setDate(start.getDate() + i);
      return x;
    });
  };

  const weeks = weekDates(baseDate);

  /* ================= HEADER LABEL ================= */
  const headerLabel = () => {
    if (view === 'month') {
      return `${bulan[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }

    if (view === 'week') {
      const start = getWeekStart(baseDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${hari[start.getDay()]}, ${start.getDate()} ${bulan[start.getMonth()]} – ${hari[end.getDay()]}, ${end.getDate()} ${bulan[end.getMonth()]} ${end.getFullYear()}`;
    }

    return `${hari[baseDate.getDay()]}, ${baseDate.getDate()} ${bulan[baseDate.getMonth()]} ${baseDate.getFullYear()}`;
  };

  /* ================= NAVIGATION FIX 🔥 ================= */
  const movePrev = () => {
    const d = new Date(baseDate);

    if (view === 'month') d.setMonth(d.getMonth() - 1);
    if (view === 'week') d.setDate(d.getDate() - 7);
    if (view === 'day') d.setDate(d.getDate() - 1);

    setCurrentDate(d);
    setSelectedDate(d);
  };

  const moveNext = () => {
    const d = new Date(baseDate);

    if (view === 'month') d.setMonth(d.getMonth() + 1);
    if (view === 'week') d.setDate(d.getDate() + 7);
    if (view === 'day') d.setDate(d.getDate() + 1);

    setCurrentDate(d);
    setSelectedDate(d);
  };

  /* ================= RENDER ================= */

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Memuat jadwal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">

      {/* HEADER */}
      <div className="px-4 pt-3">
        <div className="bg-white rounded-full shadow px-6 py-2 flex items-center gap-3">
          <button onClick={() => router.push('/menu')}>
            <IoArrowBack size={22} />
          </button>
          <Image src={plnKecil} alt="pln" width={34} />
          <h1 className="font-medium">Schedule JTM</h1>
        </div>
      </div>

      {/* DATE NAV */}
      <div className="flex items-center justify-between px-6 pt-4">
        <button onClick={movePrev}><ChevronLeft /></button>
        <div className="font-semibold text-center text-sm">{headerLabel()}</div>
        <button onClick={moveNext}><ChevronRight /></button>
      </div>

      {/* VIEW SELECT */}
      <div className="px-4 pt-4 flex gap-2">
        {['day', 'week', 'month'].map(v => (
          <button
            key={v}
            onClick={() => setView(v as any)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${view === v ? 'bg-white shadow text-sky-600' : 'text-gray-500'
              }`}
          >
            {v === 'day' ? 'Hari' : v === 'week' ? 'Minggu' : 'Bulan'}
          </button>
        ))}
      </div>

      {/* MONTH */}
      {view === 'month' && (
        <div className="flex-1 px-4 pt-4 overflow-y-auto">
          <div className="bg-white border rounded-lg">
            <div className="grid grid-cols-7 bg-gray-100">
              {hariGrid.map(h => (
                <div key={h} className="py-2 text-center text-xs font-bold">{h}</div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {days.map((d, i) => {
                const ev = d ? getEvents(d) : [];
                const show = ev.slice(0, 2);
                const more = ev.length - 2;

                return (
                  <div key={i} className="border min-h-[120px] p-2">
                    {d && (
                      <>
                        <div className="font-semibold mb-1">{d.getDate()}</div>

                        {show.map(e => (
                          <div
                            key={e.id}
                            className="text-[11px] px-2 py-1 rounded mb-1"
                            style={{ backgroundColor: e.color }}
                          >
                            {e.ulp}
                          </div>
                        ))}

                        {more > 0 && (
                          <div
                            onClick={() => {
                              setSelectedDate(d);
                              setView('week');
                            }}
                            className="text-xs text-sky-500 cursor-pointer"
                          >
                            +{more} more
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* WEEK */}
      {view === 'week' && (
        <div className="flex-1 px-4 pt-4 overflow-y-auto space-y-4">
          {weeks.map(d => (
            <div key={d.toISOString()} className="bg-white border rounded-lg">
              <div className="px-4 py-2 bg-gray-100 font-semibold">
                {hari[d.getDay()]}, {d.getDate()} {bulan[d.getMonth()]}
              </div>
              <div className="p-3 space-y-2">
                {getEvents(d).map(e => (
                  <div
                    key={e.id}
                    className="p-2 rounded"
                    style={{ backgroundColor: e.color }}
                  >
                    {e.ulp}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DAY */}
      {view === 'day' && (
        <div className="flex-1 px-4 pt-4 overflow-y-auto">
          {getEvents(baseDate).map(e => (
            <div
              key={e.id}
              className="p-3 mb-2 rounded"
              style={{ backgroundColor: e.color }}
            >
              {e.ulp}
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-cyan-400 text-white rounded-full shadow flex items-center justify-center">
        <Plus size={26} />
      </button>
    </div>
  );
}
