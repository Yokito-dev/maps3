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
  up3: string;
  ulp: string;
  penyulang: string;
  zona_proteksi: string;
  section: string;
  nama_gardu: string;
  longlat: string;
  kapasitas: string;
  fasa: string;
  start_date: Date;
  end_date: Date | null;
  progress: string;
  color: string;
}

/* ================= HELPERS (single source) ================= */
const normalizeDate = (d: string) => {
  const x = new Date(d);
  if (isNaN(x.getTime())) return new Date(); // fallback
  return new Date(x.getFullYear(), x.getMonth(), x.getDate());
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const mapScheduleData = (data: any[]): Event[] =>
  data.map((d: any, idx: number) => {
    const colorFromSheet = (d.colour || d.color || "").toString().trim();
    const sheetColorHex =
      /red/i.test(colorFromSheet) ? "#f87171" :
      /green/i.test(colorFromSheet) ? "#86efac" :
      /^#([0-9a-f]{3}|[0-9a-f]{6})/i.test(colorFromSheet) ? colorFromSheet :
      "";

    const progressText = (d.progress || d.progress_gd || "").toString().toUpperCase();
    const fallbackHex =
      /SELESAI|CLOSE/i.test(progressText) ? "#fca5a5" :
      /OPEN/i.test(progressText) ? "#86efac" :
      "#7dd3fc";

    return {
      id: String(d.id ?? ("GD-" + (d.start_date || "") + "-" + idx)),
      up3: d.up3 ?? "",
      ulp: d.ulp ?? "",
      penyulang: d.penyulang ?? "",
      zona_proteksi: d.zona ?? d.zona_proteksi ?? "",
      section: d.section ?? "",
      nama_gardu: d.nama_gardu ?? d.namaGardu ?? "",
      longlat: d.longlat ?? "",
      kapasitas: d.kapasitas ?? "",
      fasa: d.fasa ?? "",
      start_date: d.start_date ? normalizeDate(String(d.start_date)) : new Date(),
      end_date: d.end_date ? normalizeDate(String(d.end_date)) : null,
      progress: d.progress ?? d.progress_gd ?? "",
      color: sheetColorHex || fallbackHex,
    } as Event;
  });

/* ================= API ================= */
const API_URL =
  'https://script.google.com/macros/s/AKfycbzl9OlelZzrs8Skqa4mS87lihTHbEWAqB6ThbSZYfEkcjEn-18_Rs5JZ01vugFdGFQoBA/exec';

export default function SchedulePage() {
  const router = useRouter();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [view, setView] = useState<'day' | 'week' | 'month'>('month');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  // For detail overlay (matching reference pattern)
  const [openDetailId, setOpenDetailId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [openingDetail, setOpeningDetail] = useState(false);

  /* central fetch */
  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?type=schedule`, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      const data = json.data || [];
      setEvents(mapScheduleData(data));
    } catch (err) {
      console.error("FETCH FAILED:", err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();

    const needRefresh = localStorage.getItem('refreshScheduleGD');
    if (needRefresh === '1') {
      fetchSchedule();
      localStorage.removeItem('refreshScheduleGD');
    }
  }, []);

  // deep-link open after load (keeps existing behavior)
  useEffect(() => {
    const path = window.location.pathname;
    const m = path.match(/\/schedule-gd\/(.+)$/);
    if (m) {
      const id = m[1];
      const ev = events.find(x => x.id === id);
      if (ev) {
        // open using same overlay mechanism
        openDetailFromEvent(ev);
      } else {
        const t = setInterval(() => {
          const found = events.find(x => x.id === id);
          if (found) {
            openDetailFromEvent(found);
            clearInterval(t);
          }
        }, 200);
        return () => clearInterval(t);
      }
    }
  }, [events]);

  /* ================= UI helpers ================= */
  const bulan = [
    'Januari','Februari','Maret','April','Mei','Juni',
    'Juli','Agustus','September','Oktober','November','Desember'
  ];
  const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const hariGrid = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

  const baseDate = selectedDate || currentDate;
  const getEvents = (d: Date) => events.filter(e => sameDay(e.start_date, d));

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

  /* ================ overlay helpers (open/prev/next) ================ */
  // open overlay using available event (we keep this local to avoid additional API calls)
  const openDetailFromEvent = (ev: Event) => {
    setOpeningDetail(true);
    const idx = events.findIndex(x => x.id === ev.id);
    setCurrentIndex(idx);
    setDetailData(ev); // data is the event object (you can replace with fetched detail)
    setOpenDetailId(String(ev.id));
    setOpeningDetail(false);
    try { window.history.pushState(null, '', `/schedule-gd/${ev.id}`); } catch (e) {}
  };

  const closeDetail = () => {
    setOpenDetailId(null);
    setDetailData(null);
    setCurrentIndex(-1);
    try { window.history.pushState(null, '', `/schedule-gd`); } catch (e) {}
  };

  const goPrevDetail = () => {
    if (currentIndex > 0) {
      const prev = events[currentIndex - 1];
      openDetailFromEvent(prev);
    }
  };

  const goNextDetail = () => {
    if (currentIndex < events.length - 1) {
      const next = events[currentIndex + 1];
      openDetailFromEvent(next);
    }
  };

  /* ================ click handlers ================ */
  const handleEventClick = (e: Event) => {
    // follow reference pattern: open detail overlay with event as data
    openDetailFromEvent(e);
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">

      {/* HEADER */}
      <div className="px-4 pt-3">
        <div className="bg-white rounded-full shadow px-6 py-2 flex items-center gap-3">
          <button onClick={() => router.push('/menu')}>
            <IoArrowBack size={22} />
          </button>
          <Image src={plnKecil} alt="pln" width={34} />
          <h1 className="font-medium">Schedule GD</h1>
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
        {['day','week','month'].map(v => (
          <button
            key={v}
            onClick={() => setView(v as any)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              view === v ? 'bg-white shadow text-sky-600' : 'text-gray-500'
            }`}
          >
            {v === 'day' ? 'Hari' : v === 'week' ? 'Minggu' : 'Bulan'}
          </button>
        ))}
      </div>

      {/* MAIN */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Memuat jadwal GD…</p>
          </div>
        </div>
      ) : view === 'month' ? (
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
                        <div className={`font-semibold mb-1 ${sameDay(d, new Date()) ? 'text-emerald-600' : ''}`}>
                          {d.getDate()}
                        </div>

                        {show.map(e => (
                          <div
                            key={e.id}
                            onClick={() => handleEventClick(e)}
                            role="button"
                            tabIndex={0}
                            className="text-[11px] px-2 py-1 rounded mb-1 cursor-pointer hover:opacity-80 truncate"
                            style={{ backgroundColor: e.color }}
                          >
                            {e.ulp}
                          </div>
                        ))}

                        {more > 0 && (
                          <div
                            onClick={() => { setSelectedDate(d); setView('week'); }}
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
      ) : view === 'week' ? (
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
                    onClick={() => handleEventClick(e)}
                    className={`p-2 rounded cursor-pointer ${openingDetail ? 'opacity-50 pointer-events-none' : 'hover:opacity-80'}`}
                    style={{ backgroundColor: e.color }}
                  >
                    {e.ulp}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 px-4 pt-4 overflow-y-auto">
          {getEvents(baseDate).map(e => (
            <div
              key={e.id}
              onClick={() => handleEventClick(e)}
              className={`p-3 mb-2 rounded cursor-pointer ${openingDetail ? 'opacity-50 pointer-events-none' : 'hover:opacity-80'}`}
              style={{ backgroundColor: e.color }}
            >
              {e.ulp}
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => router.push('/GD-Form')}
        aria-label="Open GD Form"
        className="fixed bottom-8 right-8 w-14 h-14 bg-cyan-400 text-white rounded-full shadow flex items-center justify-center"
      >
        <Plus size={26} />
      </button>

      {/* ================= DETAIL OVERLAY (IDENTICAL STYLE / CLASSNAMES TO REFERENCE) ================= */}
      {openDetailId && detailData && (
        <ScheduleDetailOverlay
          data={detailData}
          onClose={() => {
            closeDetail();
          }}
          onPrev={() => goPrevDetail()}
          onNext={() => goNextDetail()}
          hasPrev={currentIndex > 0}
          hasNext={currentIndex < events.length - 1}
        />
      )}

    </div>
  );
}

/* ================= DETAIL OVERLAY (copied style/classnames from reference) ================= */

function ScheduleDetailOverlay({
  data,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: any) {

  const router = useRouter();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">

      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      <div className="relative flex items-center justify-center w-full max-w-4xl mx-4">

        <button
          disabled={!hasPrev}
          onClick={onPrev}
          className={`absolute left-0 -translate-x-1/2 top-1/2 -translate-y-1/2
          w-11 h-11 rounded-full bg-white shadow flex items-center justify-center
          ${!hasPrev ? 'opacity-30 cursor-default' : 'hover:bg-gray-100'}`}
        >
          <ChevronLeft size={24} />
        </button>

        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-hidden">

          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div className="font-semibold">Detail Schedule</div>

            <button
              onClick={onClose}
              className="px-2 text-gray-500 hover:text-black"
            >
              ✕
            </button>
          </div>

          <div className="px-6 py-4 overflow-y-auto max-h-[80vh] space-y-4">

            {/* Following items keep the same structure/classnames as reference
                Content values come from `data` (so data differs but visual structure is identical) */}

            <Item label="UP3" value={data.up3} />
            <Item label="ULP" value={data.ulp} />
            <Item label="Penyulang" value={data.penyulang} />
            <Item label="Zona Proteksi" value={data.zona_proteksi || data.zona} />
            <Item label="Section" value={data.section} />

            {/* PANJANG ASSET (stacked) then KMS INSPEKSI below it (per your request) */}
            <div className="space-y-1">
              <div className="text-xs text-gray-500">PANJANG ASSET (KM)</div>
              <div className="font-medium text-sm break-words">{data.kapasitas || '-'}</div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-gray-500">KMS INSPEKSI</div>
              <div className="font-medium text-sm break-words">{data.fasa || '-'}</div>
            </div>

            <Item label="Tujuan Penjadwalan" value={data.tujuan_penjadwalan || data.tujuan || 'Untuk PTT'} />

            {/* progress */}
            <ProgressItem value={data.progress} />

            {/* tambahkan temuan (di bawah progress, rata kanan) */}
            <div className="flex justify-end">
              <button
                onClick={() => router.push(`/temuan?jadwal_id=${data.id}`)}
                className="text-sm font-medium text-sky-600 hover:underline whitespace-nowrap"
              >
                Tambahkan temuan
              </button>
            </div>

            {/* keterangan */}
            <Item label="Keterangan" value={data.keterangan} />

          </div>
        </div>

        <button
          disabled={!hasNext}
          onClick={onNext}
          className={`absolute right-0 translate-x-1/2 top-1/2 -translate-y-1/2
          w-11 h-11 rounded-full bg-white shadow flex items-center justify-center
          ${!hasNext ? 'opacity-30 cursor-default' : 'hover:bg-gray-100'}`}
        >
          <ChevronRight size={24} />
        </button>

      </div>
    </div>
  );
}

/* ================= ITEM ================= */

function Item({ label, value }: any) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium text-sm break-words">{value || '-'}</div>
    </div>
  );
}

/* ================= PROGRESS ================= */

function ProgressItem({ value }: { value: any }) {
  const v = (value || '').toString().toLowerCase().trim();

  let color = 'bg-gray-400';

  if (v.includes('close')) color = 'bg-blue-500';
  else if (v.includes('done')) color = 'bg-blue-500';
  else if (v.includes('open')) color = 'bg-yellow-500';
  else if (v.includes('on')) color = 'bg-green-500';

  return (
    <div className="space-y-1">
      <div className="text-xs text-gray-500">Progress</div>

      <div className="flex items-center gap-3">
        <div className={`w-7 h-7 rounded-full ${color} text-white flex items-center justify-center text-sm font-semibold`}>
          ✓
        </div>
        <div className="font-medium text-sm">{value || '-'}</div>
      </div>
    </div>
  );
}
