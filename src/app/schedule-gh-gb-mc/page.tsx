'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { IoArrowBack } from 'react-icons/io5'
import plnKecil from '@/app/assets/plnup3/plnkecil.svg'
import Link from 'next/link'

/* ================= TYPES ================= */

interface CalendarEvent {
  id: number
  title: string
  date: Date
  color: string
  raw: any
  index: number
}

/* ================= API ================= */

const API_URL =
  'https://script.google.com/macros/s/AKfycbxIqjDk5e3ot5xhx7yACC9K2gVZe1SkJZb_Ns3-vT_5YMzp5D__60CD8hbvnlMDVD0uUQ/exec'

const CACHE_KEY = 'ghgbmc_schedule_cache_v2'

/* ============================================================
   FIX PARSER TANGGAL (AMAN UNTUK Date / number excel / string)
   ============================================================ */
function parseDateSafe(val: any): Date {
  if (!val) return new Date()

  if (val instanceof Date && !isNaN(val.getTime()))
    return new Date(val.getFullYear(), val.getMonth(), val.getDate())

  if (typeof val === 'number' && !isNaN(val)) {
    const base = new Date(1899, 11, 30)
    const d = new Date(base.getTime() + val * 86400000)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }

  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split('-').map(Number)
    return new Date(y, m - 1, d)
  }

  if (typeof val === 'string' && /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/.test(val)) {
    const [dd, mm, yy] = val.split(/\/|-/).map(Number)
    const Y = yy < 100 ? 2000 + yy : yy
    return new Date(Y, mm - 1, dd)
  }

  const d = new Date(val)
  if (!isNaN(d.getTime())) return d

  return new Date()
}

function normalizeProgressColor(progress: any) {
  const p = String(progress || '').toLowerCase()
  if (p.includes('open')) return '#86efac' // hijau
  if (p.includes('close')) return '#fca5a5' // merah
  return '#9ca3af'
}

function formatTanggal(date: any) {
  if (!date) return '-'
  const d = parseDateSafe(date)
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

/* ================= PAGE ================= */

export default function SchedulePage() {
  const router = useRouter()

  const [mounted, setMounted] = useState(false)

  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [view, setView] = useState<'day' | 'week' | 'month'>('month')

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [rawSchedule, setRawSchedule] = useState<any[]>([])

  // Detail overlay ala JTM
  const [openDetailId, setOpenDetailId] = useState<number | null>(null)
  const [currentIndex, setCurrentIndex] = useState<number>(-1)
  const [detailData, setDetailData] = useState<any>(null)
  const [openingDetail, setOpeningDetail] = useState(false)

  // indikator kecil sync (tanpa loading screen)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => setMounted(true), [])

  const applyData = (data: any[]) => {
    const arr = Array.isArray(data) ? data : []
    setRawSchedule(arr)

    const mapped: CalendarEvent[] = arr
      .filter((d: any) => d?.ulp && (d?.startDate ?? d?.start_date))
      .map((d: any, i: number) => ({
        id: Number(d.id) || i,
        title: d.ulp,
        date: parseDateSafe(d.startDate ?? d.start_date),
        color: normalizeProgressColor(d.progress),
        raw: d,
        index: i,
      }))

    setEvents(mapped)
  }

  // ======= INSTANT: cache dulu, lalu fetch terbaru di background =======
  useEffect(() => {
    if (!mounted) return

    // 1) cache
    const cache = localStorage.getItem(CACHE_KEY)
    if (cache) {
      try {
        const parsed = JSON.parse(cache)
        const data = Array.isArray(parsed) ? parsed : parsed?.data
        if (Array.isArray(data)) applyData(data)
      } catch {}
    }

    // 2) fetch terbaru
    const controller = new AbortController()

    const fetchLatest = async () => {
      try {
        setSyncing(true)
        const res = await fetch(API_URL, { signal: controller.signal, cache: 'no-store' })
        const data = await res.json()

        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }))
        applyData(data)
      } catch (err: any) {
        if (err?.name === 'AbortError') return
        console.error('Fetch schedule gagal:', err)
      } finally {
        setSyncing(false)
      }
    }

    fetchLatest()
    return () => controller.abort()
  }, [mounted])

  /* ================= CONST ================= */

  const bulan = useMemo(
    () => [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ],
    []
  )

  const hari = useMemo(
    () => ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
    []
  )

  const hariGrid = useMemo(() => ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'], [])

  const baseDate = selectedDate || currentDate

  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  const getEvents = (d: Date) => events.filter(e => sameDay(e.date, d))

  const getDaysInMonth = (d: Date) => {
    const y = d.getFullYear()
    const m = d.getMonth()
    const first = new Date(y, m, 1).getDay()
    const total = new Date(y, m + 1, 0).getDate()
    return [
      ...Array(first).fill(null),
      ...Array.from({ length: total }, (_, i) => new Date(y, m, i + 1)),
    ]
  }

  const days = useMemo(() => getDaysInMonth(currentDate), [currentDate])

  const getWeekStart = (d: Date) => {
    const x = new Date(d)
    x.setDate(d.getDate() - d.getDay())
    return x
  }

  const weekDates = (d: Date) => {
    const start = getWeekStart(d)
    return Array.from({ length: 7 }, (_, i) => {
      const x = new Date(start)
      x.setDate(start.getDate() + i)
      return x
    })
  }

  const weeks = useMemo(() => weekDates(baseDate), [baseDate])

  /* ================= NAV ================= */

  const movePrev = () => {
    const d = new Date(baseDate)
    if (view === 'month') d.setMonth(d.getMonth() - 1)
    if (view === 'week') d.setDate(d.getDate() - 7)
    if (view === 'day') d.setDate(d.getDate() - 1)
    setCurrentDate(d)
    setSelectedDate(d)
  }

  const moveNext = () => {
    const d = new Date(baseDate)
    if (view === 'month') d.setMonth(d.getMonth() + 1)
    if (view === 'week') d.setDate(d.getDate() + 7)
    if (view === 'day') d.setDate(d.getDate() + 1)
    setCurrentDate(d)
    setSelectedDate(d)
  }

  const headerLabel = () => {
    if (view === 'month')
      return `${bulan[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    if (view === 'week') {
      const start = getWeekStart(baseDate)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      return `${start.getDate()} ${bulan[start.getMonth()]} – ${end.getDate()} ${bulan[end.getMonth()]}`
    }
    return `${hari[baseDate.getDay()]}, ${baseDate.getDate()} ${bulan[baseDate.getMonth()]}`
  }

  /* ================= OPEN DETAIL ala JTM ================= */

  const openDetail = (id: number) => {
    if (openingDetail) return
    setOpeningDetail(true)

    const idx = events.findIndex(x => Number(x.id) === Number(id))
    setCurrentIndex(idx)

    if (idx >= 0) {
      setDetailData(rawSchedule[idx])
      setOpenDetailId(id)
    }

    setOpeningDetail(false)
  }

  if (!mounted) return null

  /* ================= RENDER ================= */

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">

      {/* HEADER */}
      <div className="px-4 pt-3">
        <div className="bg-white rounded-full shadow px-6 py-2 flex items-center gap-3">
          <button onClick={() => router.push('/menu')}>
            <IoArrowBack size={22} />
          </button>
          <Image src={plnKecil} alt="pln" width={34} />
          <h1 className="font-medium">Schedule GH GB MC</h1>

          {syncing && (
            <div className="ml-auto text-xs text-gray-400 flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              sync
            </div>
          )}
        </div>
      </div>

      {/* DATE NAV */}
      <div className="flex items-center justify-between px-6 pt-4">
        <button onClick={movePrev}><ChevronLeft /></button>
        <div className="font-semibold text-sm">{headerLabel()}</div>
        <button onClick={moveNext}><ChevronRight /></button>
      </div>

      {/* VIEW SELECT */}
      <div className="px-4 pt-4 flex gap-2">
        {(['day', 'week', 'month'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              view === v ? 'bg-white shadow text-sky-600' : 'text-gray-500'
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
              {days.map((d, i) => (
                <div key={i} className="border min-h-[120px] p-2">
                  {d && (
                    <>
                      <div className="font-semibold mb-1">{d.getDate()}</div>
                      {(() => {
                        const ev = getEvents(d)
                        const show = ev.slice(0, 2)
                        const more = ev.length - 2

                        return (
                          <>
                            {show.map(e => (
                              <div
                                key={e.id}
                                onClick={() => openDetail(e.id)}
                                className={`text-[11px] px-2 py-1 rounded mb-1 cursor-pointer ${
                                  openingDetail ? 'opacity-50 pointer-events-none' : 'hover:opacity-90'
                                }`}
                                style={{ backgroundColor: e.color }}
                              >
                                {e.title}
                              </div>
                            ))}

                            {more > 0 && (
                              <div
                                onClick={() => {
                                  setSelectedDate(d)
                                  setView('week')
                                }}
                                className="text-xs text-sky-600 cursor-pointer font-medium"
                              >
                                +{more} more
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </>
                  )}
                </div>
              ))}
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
                    onClick={() => openDetail(e.id)}
                    className={`p-2 rounded cursor-pointer ${
                      openingDetail ? 'opacity-50 pointer-events-none' : 'hover:opacity-90'
                    }`}
                    style={{ backgroundColor: e.color }}
                  >
                    {e.title}
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
              onClick={() => openDetail(e.id)}
              className={`p-3 mb-2 rounded cursor-pointer ${
                openingDetail ? 'opacity-50 pointer-events-none' : 'hover:opacity-90'
              }`}
              style={{ backgroundColor: e.color }}
            >
              {e.title}
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <Link href="/GHGBMC-Form">
        <button className="fixed bottom-8 right-8 w-14 h-14 bg-cyan-400 text-white rounded-full shadow flex items-center justify-center">
          <Plus size={26} />
        </button>
      </Link>

      {/* DETAIL OVERLAY ala JTM (tombol kiri/kanan di samping box) */}
      {openDetailId != null && detailData && (
        <ScheduleDetailOverlay
          data={detailData}
          onClose={() => {
            setOpenDetailId(null)
            setCurrentIndex(-1)
            setDetailData(null)
          }}
          onPrev={() => {
            if (currentIndex > 0) {
              const newIndex = currentIndex - 1
              setCurrentIndex(newIndex)
              setDetailData(rawSchedule[newIndex])
              setOpenDetailId(events[newIndex].id)
            }
          }}
          onNext={() => {
            if (currentIndex < events.length - 1) {
              const newIndex = currentIndex + 1
              setCurrentIndex(newIndex)
              setDetailData(rawSchedule[newIndex])
              setOpenDetailId(events[newIndex].id)
            }
          }}
          hasPrev={currentIndex > 0}
          hasNext={currentIndex < events.length - 1}
        />
      )}
    </div>
  )
}

/* ================= DETAIL OVERLAY (STYLE JTM) ================= */

function ScheduleDetailOverlay({
  data,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: any) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* wrapper center */}
      <div className="relative flex items-center justify-center w-full max-w-4xl mx-4">
        {/* PREV */}
        <button
          disabled={!hasPrev}
          onClick={onPrev}
          className={`absolute left-0 -translate-x-1/2 top-1/2 -translate-y-1/2
            w-11 h-11 rounded-full bg-white shadow flex items-center justify-center
            ${!hasPrev ? 'opacity-30 cursor-default' : 'hover:bg-gray-100'}`}
        >
          <ChevronLeft size={24} />
        </button>

        {/* BOX DETAIL */}
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
            <Item label="NAMA GARDU" value={data.namaGardu} />
            <Item label="STATUS MILIK" value={data.statusMilik} />
            <Item label="TANGGAL" value={formatTanggal(data.startDate ?? data.start_date)} />
            <ProgressItem value={data.progress} />
          </div>
        </div>

        {/* NEXT */}
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
  )
}

/* ================= ITEM (STYLE JTM) ================= */

function Item({ label, value }: any) {
  return (
    <div className="space-y-1">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="font-medium text-lg break-words">{value || '-'}</div>
    </div>
  )
}

/* ================= PROGRESS (STYLE JTM) ================= */

function ProgressItem({ value }: { value: any }) {
  const v = String(value || '').toLowerCase().trim()

  let color = 'bg-gray-400'
  if (v.includes('close')) color = 'bg-red-500'
  else if (v.includes('open')) color = 'bg-green-500'

  return (
    <div className="space-y-1">
      <div className="text-xs text-gray-500">Progress</div>
      <div className="flex items-center gap-3">
        <div className={`w-7 h-7 rounded-full ${color} text-white flex items-center justify-center text-sm font-semibold`}>
          ✓
        </div>
        <div className="font-medium text-lg">{value || '-'}</div>
      </div>
    </div>
  )
}
