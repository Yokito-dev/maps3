"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { IoArrowBack } from "react-icons/io5";
import plnKecil from "@/app/assets/plnup3/plnkecil.svg";

/* ============================================================
   FIX PARSER TANGGAL
   ============================================================ */
function parseDateSafe(val: any): Date {
  if (!val) return new Date();

  if (val instanceof Date && !isNaN(val.getTime()))
    return new Date(val.getFullYear(), val.getMonth(), val.getDate());

  if (typeof val === "number" && !isNaN(val)) {
    const base = new Date(1899, 11, 30);
    const d = new Date(base.getTime() + val * 86400000);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  if (/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/.test(val)) {
    const [dd, mm, yy] = val.split(/\/|-/).map(Number);
    const Y = yy < 100 ? 2000 + yy : yy;
    return new Date(Y, mm - 1, dd);
  }

  const d = new Date(val);
  if (!isNaN(d.getTime())) return d;

  return new Date();
}

/* ================= TYPE ================= */
interface Event {
  id: string;
  ulp: string;
  date: Date;
  color: string;
  index: number;
}

/* ================= API ================= */
const API_URL =
  "https://script.google.com/macros/s/AKfycbyCxXZWyPBCJsyuLZpeynkr6V5FGCsLZopQaUQTPRIMKA6vpXriueq26O1n-SrsK_ALfA/exec";

type Props = {
  initialData: any[];
};

function SkeletonPill() {
  return (
    <div className="h-[14px] rounded bg-gray-200 animate-pulse w-full" />
  );
}

export default function ScheduleClient({ initialData }: Props) {
  const router = useRouter();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<"day" | "week" | "month">("month");

  const [events, setEvents] = useState<Event[]>([]);
  const [rawSchedule, setRawSchedule] = useState<any[]>([]);

  const [openDetailId, setOpenDetailId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [detailData, setDetailData] = useState<any>(null);

  // loading yang cuma buat event area (bukan nge-blank halaman)
  const [showCellLoading, setShowCellLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const applyData = useCallback((data: any[]) => {
    setRawSchedule(data);

    const mapped: Event[] = data.map((item: any, i: number) => ({
      id: String(item.id ?? i),
      ulp: item.ulp,
      date: parseDateSafe(item.start_date),
      color: i % 2 === 0 ? "#7dd3fc" : "#86efac",
      index: i,
    }));

    setEvents(mapped);
  }, []);

  /* ============================================================
     1) tampilkan initialData/cached data dulu (biar instan)
     2) fetch terbaru background
     3) skeleton cuma di event area + dibatasin max 1.2 detik
     ============================================================ */
  useEffect(() => {
    let hasShownAnything = false;

    // A) langsung pakai data dari server
    if (Array.isArray(initialData) && initialData.length > 0) {
      applyData(initialData);
      hasShownAnything = true;
      try {
        localStorage.setItem("schedule_cache", JSON.stringify(initialData));
      } catch {}
    } else {
      // B) fallback ke cache
      const cache = localStorage.getItem("schedule_cache");
      if (cache) {
        try {
          const parsed = JSON.parse(cache);
          if (Array.isArray(parsed) && parsed.length > 0) {
            applyData(parsed);
            hasShownAnything = true;
          }
        } catch {}
      }
    }

    // kalau belum ada data sama sekali, baru tampilkan skeleton event
    if (!hasShownAnything) setShowCellLoading(true);

    // skeleton jangan kelamaan (max 1.2 detik)
    const stopLoadingTimer = setTimeout(() => {
      setShowCellLoading(false);
    }, 1200);

    // fetch terbaru background (tidak bikin blank)
    const controller = new AbortController();

    const fetchLatest = async () => {
      setIsSyncing(true);
      try {
        const res = await fetch(API_URL + "?type=schedule", {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await res.json();

        if (Array.isArray(data)) {
          applyData(data);
          try {
            localStorage.setItem("schedule_cache", JSON.stringify(data));
          } catch {}
        }
      } catch (e) {
        // kalau gagal, ya udah: tetap tampilkan yang ada (kalender tetap kebuka)
      } finally {
        setIsSyncing(false);
        setShowCellLoading(false); // kalau sudah selesai, matiin skeleton
      }
    };

    // jalanin setelah render awal
    const t = setTimeout(fetchLatest, 0);

    return () => {
      clearTimeout(stopLoadingTimer);
      clearTimeout(t);
      controller.abort();
    };
  }, [initialData, applyData]);

  /* ================= UTIL ================= */
  const bulan = useMemo(
    () => [
      "Januari","Februari","Maret","April","Mei","Juni",
      "Juli","Agustus","September","Oktober","November","Desember",
    ],
    []
  );

  const hari = useMemo(
    () => ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"],
    []
  );

  const hariGrid = useMemo(() => ["Min","Sen","Sel","Rab","Kam","Jum","Sab"], []);

  const baseDate = selectedDate || currentDate;

  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const getEvents = (d: Date) => events.filter((e) => sameDay(e.date, d));

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
    if (view === "month")
      return `${bulan[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

    if (view === "week") {
      const start = getWeekStart(baseDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.getDate()} ${bulan[start.getMonth()]} – ${end.getDate()} ${bulan[end.getMonth()]}`;
    }

    return `${hari[baseDate.getDay()]}, ${baseDate.getDate()} ${bulan[baseDate.getMonth()]}`;
  };

  const movePrev = () => {
    const d = new Date(baseDate);
    if (view === "month") d.setMonth(d.getMonth() - 1);
    if (view === "week") d.setDate(d.getDate() - 7);
    if (view === "day") d.setDate(d.getDate() - 1);
    setCurrentDate(d);
    setSelectedDate(d);
  };

  const moveNext = () => {
    const d = new Date(baseDate);
    if (view === "month") d.setMonth(d.getMonth() + 1);
    if (view === "week") d.setDate(d.getDate() + 7);
    if (view === "day") d.setDate(d.getDate() + 1);
    setCurrentDate(d);
    setSelectedDate(d);
  };

  /* ================= OPEN DETAIL ================= */
  const openDetail = (id: string) => {
    const idx = events.findIndex((x) => String(x.id) === String(id));
    if (idx < 0) return;

    setCurrentIndex(idx);
    setDetailData(rawSchedule[idx]);
    setOpenDetailId(id);
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* HEADER */}
      <div className="px-4 pt-3">
        <div className="bg-white rounded-full shadow px-6 py-2 flex items-center gap-3">
          <button onClick={() => router.push("/menu")}>
            <IoArrowBack size={22} />
          </button>
          <Image src={plnKecil} alt="pln" width={34} />
          <h1 className="font-medium">Schedule JTM</h1>

          {/* indikator kecil saja, nggak ganggu */}
          {isSyncing && (
            <span className="ml-auto text-xs text-gray-400">sync...</span>
          )}
        </div>
      </div>

      {/* DATE NAV */}
      <div className="flex items-center justify-between px-6 pt-4">
        <button onClick={movePrev}>
          <ChevronLeft />
        </button>
        <div className="font-semibold text-center text-sm">{headerLabel()}</div>
        <button onClick={moveNext}>
          <ChevronRight />
        </button>
      </div>

      {/* VIEW SELECTOR */}
      <div className="px-4 pt-4 flex gap-2">
        {["day", "week", "month"].map((v) => (
          <button
            key={v}
            onClick={() => setView(v as any)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              view === v ? "bg-white shadow text-sky-600" : "text-gray-500"
            }`}
          >
            {v === "day" ? "Hari" : v === "week" ? "Minggu" : "Bulan"}
          </button>
        ))}
      </div>

      {/* MONTH VIEW */}
      {view === "month" && (
        <div className="flex-1 px-4 pt-4 overflow-y-auto">
          <div className="bg-white border rounded-lg">
            <div className="grid grid-cols-7 bg-gray-100">
              {hariGrid.map((h) => (
                <div key={h} className="py-2 text-center text-xs font-bold">
                  {h}
                </div>
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
                        {/* tanggal selalu tampil */}
                        <div className="font-semibold mb-1">{d.getDate()}</div>

                        {/* loading hanya event area */}
                        {showCellLoading && events.length === 0 ? (
                          <div className="space-y-2 mt-2">
                            <SkeletonPill />
                            <SkeletonPill />
                          </div>
                        ) : (
                          <>
                            {show.map((e) => (
                              <div
                                key={e.id}
                                onClick={() => openDetail(e.id)}
                                className="text-[11px] px-2 py-1 rounded mb-1 cursor-pointer hover:opacity-80"
                                style={{ backgroundColor: e.color }}
                              >
                                {e.ulp}
                              </div>
                            ))}

                            {more > 0 && (
                              <div
                                onClick={() => {
                                  setSelectedDate(d);
                                  setView("week");
                                }}
                                className="text-xs text-sky-500 cursor-pointer"
                              >
                                +{more} more
                              </div>
                            )}
                          </>
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

      {/* WEEK VIEW */}
      {view === "week" && (
        <div className="flex-1 px-4 pt-4 overflow-y-auto space-y-4">
          {weeks.map((d) => {
            const ev = getEvents(d);

            return (
              <div key={d.toISOString()} className="bg-white border rounded-lg">
                <div className="px-4 py-2 bg-gray-100 font-semibold">
                  {hari[d.getDay()]}, {d.getDate()} {bulan[d.getMonth()]}
                </div>

                <div className="p-3 space-y-2">
                  {showCellLoading && events.length === 0 ? (
                    <>
                      <SkeletonPill />
                      <SkeletonPill />
                    </>
                  ) : (
                    ev.map((e) => (
                      <div
                        key={e.id}
                        onClick={() => openDetail(e.id)}
                        className="p-2 rounded cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: e.color }}
                      >
                        {e.ulp}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DAY VIEW */}
      {view === "day" && (
        <div className="flex-1 px-4 pt-4 overflow-y-auto">
          {showCellLoading && events.length === 0 ? (
            <div className="bg-white border rounded-lg p-4 space-y-3">
              <SkeletonPill />
              <SkeletonPill />
              <SkeletonPill />
            </div>
          ) : (
            getEvents(baseDate).map((e) => (
              <div
                key={e.id}
                onClick={() => openDetail(e.id)}
                className="p-3 mb-2 rounded cursor-pointer hover:opacity-80"
                style={{ backgroundColor: e.color }}
              >
                {e.ulp}
              </div>
            ))
          )}
        </div>
      )}

      {/* FAB */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-cyan-400 text-white rounded-full shadow flex items-center justify-center">
        <Plus size={26} />
      </button>

      {/* DETAIL OVERLAY */}
      {openDetailId && detailData && (
        <ScheduleDetailOverlay
          data={detailData}
          onClose={() => {
            setOpenDetailId(null);
            setCurrentIndex(-1);
            setDetailData(null);
          }}
          onPrev={() => {
            if (currentIndex > 0) {
              const newIndex = currentIndex - 1;
              setCurrentIndex(newIndex);
              setDetailData(rawSchedule[newIndex]);
              setOpenDetailId(events[newIndex].id);
            }
          }}
          onNext={() => {
            if (currentIndex < events.length - 1) {
              const newIndex = currentIndex + 1;
              setCurrentIndex(newIndex);
              setDetailData(rawSchedule[newIndex]);
              setOpenDetailId(events[newIndex].id);
            }
          }}
          hasPrev={currentIndex > 0}
          hasNext={currentIndex < events.length - 1}
        />
      )}
    </div>
  );
}

/* ================= DETAIL OVERLAY ================= */

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
      <div onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="relative flex items-center justify-center w-full max-w-4xl mx-4">
        <button
          disabled={!hasPrev}
          onClick={onPrev}
          className={`absolute left-0 -translate-x-1/2 top-1/2 -translate-y-1/2
            w-11 h-11 rounded-full bg-white shadow flex items-center justify-center
            ${!hasPrev ? "opacity-30 cursor-default" : "hover:bg-gray-100"}`}
        >
          <ChevronLeft size={24} />
        </button>

        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div className="font-semibold">Detail Schedule</div>
            <button onClick={onClose} className="px-2 text-gray-500 hover:text-black">
              ✕
            </button>
          </div>

          <div className="px-6 py-4 overflow-y-auto max-h-[80vh] space-y-4">
            <Item label="UP3" value={data.up3} />
            <Item label="ULP" value={data.ulp} />
            <Item
              label="Tanggal"
              value={parseDateSafe(data.start_date).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            />
            <Item label="Penyulang" value={data.penyulang} />
            <Item label="Zona Proteksi" value={data.zona} />
            <Item label="Section" value={data.section} />
            <Item label="PANJANG ASSET (KM)" value={data.kms_aset} />
            <Item label="KMS INSPEKSI" value={data.kms_inspeksi} />
            <Item label="Tujuan Penjadwalan" value={data.tujuan_penjadwalan} />

            <ProgressItem value={data.progress} />

            <div className="flex justify-end">
              <button
                onClick={() => router.push(`/temuan?jadwal_id=${data.id}`)}
                className="text-sm font-medium text-sky-600 hover:underline whitespace-nowrap"
              >
                Tambahkan temuan
              </button>
            </div>

            <Item label="Keterangan" value={data.keterangan} />
          </div>
        </div>

        <button
          disabled={!hasNext}
          onClick={onNext}
          className={`absolute right-0 translate-x-1/2 top-1/2 -translate-y-1/2
            w-11 h-11 rounded-full bg-white shadow flex items-center justify-center
            ${!hasNext ? "opacity-30 cursor-default" : "hover:bg-gray-100"}`}
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
}

function Item({ label, value }: any) {
  return (
    <div className="space-y-1">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="font-medium text-lg break-words">{value || "-"}</div>
    </div>
  );
}

function ProgressItem({ value }: { value: any }) {
  const v = (value || "").toString().toLowerCase().trim();

  let color = "bg-gray-400";
  if (v.includes("close")) color = "bg-blue-500";
  else if (v.includes("done")) color = "bg-blue-500";
  else if (v.includes("open")) color = "bg-yellow-500";
  else if (v.includes("on")) color = "bg-green-500";

  return (
    <div className="space-y-1">
      <div className="text-xs text-gray-500">Progress</div>
      <div className="flex items-center gap-3">
        <div className={`w-7 h-7 rounded-full ${color} text-white flex items-center justify-center text-sm font-semibold`}>
          ✓
        </div>
        <div className="font-medium text-lg">{value || "-"}</div>
      </div>
    </div>
  );
}
