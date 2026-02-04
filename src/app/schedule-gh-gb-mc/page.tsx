'use client'

import React, { useState, useEffect } from 'react'
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
}

/* ================= API ================= */

const API_URL =
  'https://script.google.com/macros/s/AKfycbxIqjDk5e3ot5xhx7yACC9K2gVZe1SkJZb_Ns3-vT_5YMzp5D__60CD8hbvnlMDVD0uUQ/exec'

/* ================= PAGE ================= */

export default function SchedulePage() {
  const router = useRouter()

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)

  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [view, setView] = useState<'day' | 'week' | 'month'>('month')

  const [events, setEvents] = useState<CalendarEvent[]>([])

  const [openDetail, setOpenDetail] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)


  /* ================= MOUNT ================= */

  useEffect(() => {
    setMounted(true)
  }, [])

  /* ================= FETCH ================= */

  useEffect(() => {
    if (!mounted) return

    const fetchSchedule = async () => {
      try {
        setLoading(true)
        const res = await fetch(API_URL)
        const data = await res.json()

        const mapped: CalendarEvent[] = data
          .filter((d: any) => d.ulp && d.startDate)
          .map((d: any, i: number) => ({
            id: Number(d.id) || i,
            title: d.ulp,
            date: new Date(d.startDate),
            color:
              d.progress?.toLowerCase().includes('open')
                ? '#86efac'   // HIJAU
                : d.progress?.toLowerCase().includes('close')
                  ? '#fca5a5' // MERAH
                  : '#9ca3af', // abu-abu (opsional)

            raw: d,
          }))

        setEvents(mapped)
      } finally {
        setLoading(false)
      }
    }

    fetchSchedule()
  }, [mounted])

  /* ================= GUARD ================= */

  if (!mounted || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Memuat jadwal...</p>
        </div>
      </div>
    )
  }

  /* ================= CONST ================= */

  const bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]

  const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  const hariGrid = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

  const baseDate = selectedDate || currentDate

  /* ================= HELPERS ================= */

  const sameDay = (a: Date, b: Date) =>
    a.toDateString() === b.toDateString()

  const getEvents = (d: Date) =>
    events.filter(e => sameDay(e.date, d))

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

  const days = getDaysInMonth(currentDate)

  const weekDates = (d: Date) => {
    const start = new Date(d)
    start.setDate(d.getDate() - d.getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const x = new Date(start)
      x.setDate(start.getDate() + i)
      return x
    })
  }

  const weeks = weekDates(baseDate)

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
      const w = weekDates(baseDate)
      return `${w[0].getDate()} ${bulan[w[0].getMonth()]} – ${w[6].getDate()} ${bulan[w[6].getMonth()]}`
    }
    return `${hari[baseDate.getDay()]}, ${baseDate.getDate()} ${bulan[baseDate.getMonth()]}`
  }

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
                                onClick={() => {
                                  setSelectedEvent(e)
                                  setOpenDetail(true)
                                }}
                                className="text-[11px] px-2 py-1 rounded mb-1 cursor-pointer"
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
                    onClick={() => {
                      setSelectedEvent(e)
                      setOpenDetail(true)
                    }}
                    className="p-2 rounded cursor-pointer"
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
              onClick={() => {
                setSelectedEvent(e)
                setOpenDetail(true)
              }}
              className="p-3 mb-2 rounded cursor-pointer"
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

      {/* MODAL */}
      {openDetail && selectedEvent && (
        <ScheduleDetailModal
          data={selectedEvent.raw}
          onClose={() => setOpenDetail(false)}
        />
      )}
    </div>
  )
}

/* ================= MODAL ================= */

function ScheduleDetailModal({ data, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl z-10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="font-semibold">Detail Schedule</div>

          <button
            onClick={onClose}
            className="px-2 text-gray-500 hover:text-black"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 overflow-y-auto max-h-[65vh]">
          <Item label="UP3" value={data.up3} />
          <Item label="ULP" value={data.ulp} />
          <Item label="NAMA GARDU" value={data.namaGardu} />
          <Item label="STATUS MILIK" value={data.statusMilik} />
          <Item label="TANGGAL" value={formatTanggal(data.startDate)} />
          <ProgressItem value={data.progress} />
        </div>
      </div>
    </div>
  )
}


/* ================= COMPONENT ================= */

const Item = ({ label, value }: any) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="font-medium">{value || '-'}</p>
  </div>
)

const ProgressItem = ({ value }: any) => {
  const color =
    value?.toLowerCase().includes('open')
      ? 'bg-green-400'
      : value?.toLowerCase().includes('close')
        ? 'bg-red-400'
        : 'bg-gray-400'


  return (
    <div>
      <p className="text-xs text-gray-500">PROGRESS</p>
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-full ${color} text-white flex items-center justify-center`}>
          ✓
        </div>
        <p className="font-medium">{value || '-'}</p>
      </div>
    </div>
  )
}
function formatTanggal(date: any) {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

