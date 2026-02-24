'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  IoArrowBack,
  IoChevronForward,
  IoCreateOutline,
  IoLocationOutline,
  IoAdd,} from 'react-icons/io5'
import { useRouter } from 'next/navigation'
import plnKecil from '@/app/assets/plnup3/plnkecil.svg'
import Image from 'next/image'

const API_URL =
  'https://script.google.com/macros/s/AKfycbyCxXZWyPBCJsyuLZpeynkr6V5FGCsLZopQaUQTPRIMKA6vpXriueq26O1n-SrsK_ALfA/exec'

type ULPItem = { ulp: string; count: number }

type PemRow = {
  row: number
  up3: string
  ulp: string
  penyulang: string
  zonaProteksi: string
  section: string
  panjangKms: any
  koordinat: string
  alasan: string
  pemeliharaan: string
  tanggalPemeliharaan: string
  dieksekusiOleh: string
  jumlahItemMaterial: any
  fotoSebelum1?: string
  fotoSebelum2?: string
  fotoProses?: string
  fotoSesudah1?: string
  fotoSesudah2?: string
  nilaiTahananIsolasi?: any
  nilaiPentanahan?: any
  keterangan?: string
}

type ExecItem = { name: string; count: number }
type DateItem = { key: string; label: string; count: number; ts: number }

function mapsLinkFromKoordinat(koor: string) {
  if (!koor) return ''
  const cleaned = koor.replace(/\s+/g, '')
  if (!cleaned.includes(',')) return ''
  return `https://www.google.com/maps?q=${encodeURIComponent(cleaned)}`
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function parseDateAny(raw: string): Date | null {
  if (!raw) return null
  const s = String(raw).trim()

  // dd/mm/yyyy
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m1) {
    const dd = Number(m1[1])
    const mm = Number(m1[2])
    const yy = Number(m1[3])
    const d = new Date(yy, mm - 1, dd)
    return isNaN(d.getTime()) ? null : d
  }

  // yyyy-mm-dd
  const m2 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m2) {
    const yy = Number(m2[1])
    const mm = Number(m2[2])
    const dd = Number(m2[3])
    const d = new Date(yy, mm - 1, dd)
    return isNaN(d.getTime()) ? null : d
  }

  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function dateKeyAndLabel(raw: string) {
  const d = parseDateAny(raw)
  if (!d) {
    const v = String(raw || '').trim()
    return { key: v, label: v, ts: 0 }
  }

  const yy = d.getFullYear()
  const mm = pad2(d.getMonth() + 1)
  const dd = pad2(d.getDate())

  return {
    key: `${yy}-${mm}-${dd}`,
    label: `${dd}/${mm}/${yy}`, // dd/mm/yyyy
    ts: d.getTime(),
  }
}

function ListRow({
  label,
  count,
  onClick,
}: {
  label: string
  count?: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-4 border-b hover:bg-gray-50 transition px-2"
    >
      <div className="flex items-center gap-3">
        <div className="text-[15px] font-medium">{label}</div>
        {typeof count === 'number' && (
          <div className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
            {count}
          </div>
        )}
      </div>
      <IoChevronForward className="text-gray-500" />
    </button>
  )
}

// list model AppSheet
function DataRowItem({ r }: { r: PemRow }) {
  const thumb = r.fotoSebelum1 || r.fotoProses || r.fotoSesudah1 || ''
  const gmaps = mapsLinkFromKoordinat(r.koordinat || '')

  return (
    <div className="w-full border-b px-2 py-3 flex gap-4">
      {/* THUMB */}
      <div className="w-[72px] h-[72px] rounded-md overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="foto" className="w-full h-full object-cover" />
        ) : (
          <div className="text-[11px] text-gray-400">No Foto</div>
        )}
      </div>

      {/* TEXT */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[15px] truncate">
          {r.penyulang || '-'}
        </div>
        <div className="text-[13px] text-gray-700 truncate">
          - {r.pemeliharaan || '-'}
        </div>
      </div>

      {/* RIGHT */}
      <div className="shrink-0 flex flex-col items-end justify-between">
        <div className="text-[12px] text-gray-700 font-medium">
          {r.dieksekusiOleh || '-'}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-gray-600 hover:text-black"
            title="Edit (coming soon)"
            onClick={() => {}}
          >
            <IoCreateOutline size={18} />
          </button>

          {gmaps ? (
            <a
              href={gmaps}
              target="_blank"
              rel="noreferrer"
              className="text-gray-600 hover:text-black"
              title="Buka lokasi"
            >
              <IoLocationOutline size={18} />
            </a>
          ) : (
            <button
              type="button"
              className="text-gray-300 cursor-not-allowed"
              title="Koordinat kosong"
              disabled
            >
              <IoLocationOutline size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  const router = useRouter()

  // 0=ULP, 1=EXEC, 2=DATE, 3=DATA
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0)

  const [ulpList, setUlpList] = useState<ULPItem[]>([])
  const [selectedUlp, setSelectedUlp] = useState<string>('') // '' = ALL
  const [selectedExec, setSelectedExec] = useState<string>('All')
  const [selectedDateKey, setSelectedDateKey] = useState<string>('All')

  const [rowsScope, setRowsScope] = useState<PemRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`${API_URL}?type=pemeliharaan_ulps`)
      .then(r => r.json())
      .then((res: ULPItem[]) => setUlpList(Array.isArray(res) ? res : []))
      .catch(() => setUlpList([]))
      .finally(() => setLoading(false))
  }, [])

  const totalAll = useMemo(
    () => ulpList.reduce((a, b) => a + (b.count || 0), 0),
    [ulpList]
  )

  const loadRowsForUlp = async (ulp: string) => {
    setLoading(true)
    try {
      const url = ulp
        ? `${API_URL}?type=pemeliharaan&ulp=${encodeURIComponent(ulp)}`
        : `${API_URL}?type=pemeliharaan`

      const res = await fetch(url)
      const json = await res.json().catch(() => [])
      setRowsScope(Array.isArray(json) ? json : [])
    } finally {
      setLoading(false)
    }
  }

  const execList: ExecItem[] = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rowsScope) {
      const key = (r.dieksekusiOleh || '').trim()
      if (!key) continue
      map.set(key, (map.get(key) || 0) + 1)
    }
    const arr = Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    const total = arr.reduce((x, y) => x + y.count, 0)
    return [{ name: 'All', count: total }, ...arr]
  }, [rowsScope])

  const rowsByExec = useMemo(() => {
    if (!selectedExec || selectedExec === 'All') return rowsScope
    return rowsScope.filter(
      r => String(r.dieksekusiOleh || '').trim() === selectedExec
    )
  }, [rowsScope, selectedExec])

  const dateList: DateItem[] = useMemo(() => {
    const map = new Map<string, { label: string; count: number; ts: number }>()
    for (const r of rowsByExec) {
      const raw = String(r.tanggalPemeliharaan || '').trim()
      if (!raw) continue
      const norm = dateKeyAndLabel(raw)

      const prev = map.get(norm.key)
      if (!prev) map.set(norm.key, { label: norm.label, count: 1, ts: norm.ts })
      else
        map.set(norm.key, {
          label: prev.label,
          count: prev.count + 1,
          ts: prev.ts || norm.ts,
        })
    }

    const arr = Array.from(map.entries())
      .map(([key, v]) => ({ key, label: v.label, count: v.count, ts: v.ts }))
      .sort((a, b) => (b.ts || 0) - (a.ts || 0))

    const total = arr.reduce((x, y) => x + y.count, 0)
    return [{ key: 'All', label: 'All', count: total, ts: 0 }, ...arr]
  }, [rowsByExec])

  const rowsFinal = useMemo(() => {
    if (!selectedDateKey || selectedDateKey === 'All') return rowsByExec
    return rowsByExec.filter(r => {
      const raw = String(r.tanggalPemeliharaan || '').trim()
      if (!raw) return false
      const norm = dateKeyAndLabel(raw)
      return norm.key === selectedDateKey
    })
  }, [rowsByExec, selectedDateKey])

  // ✅ Back 1 tombol: mundur step dulu, baru ke menu kalau sudah di step 0
  const handleBackOneButton = () => {
    if (step === 3) {
      setStep(2)
      return
    }
    if (step === 2) {
      setSelectedDateKey('All')
      setStep(1)
      return
    }
    if (step === 1) {
      setSelectedExec('All')
      setSelectedDateKey('All')
      setRowsScope([])
      setSelectedUlp('')
      setStep(0)
      return
    }
    router.push('/menu')
  }

  return (
    <div className="h-screen bg-white font-poppins flex flex-col relative">
      {/* HEADER */}
      <div className="px-4 pt-3">
        <div className="bg-white rounded-full shadow px-6 py-2 flex items-center gap-3">
          <button onClick={handleBackOneButton}>
            <IoArrowBack size={22} />
          </button>
          <Image src={plnKecil} alt="pln" width={34} />
          <h1 className="font-medium">Pemeliharaan JTM</h1>
        </div>
      </div>

      {/* CONTENT */}
      <main className="flex-1 overflow-hidden px-4 pt-3 pb-4">
        <div className="h-full bg-white border rounded-xl overflow-hidden flex flex-col">
          {loading && (
            <div className="h-1 w-full bg-gray-200">
              <div className="h-1 w-1/3 bg-gray-500 animate-pulse" />
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {/* STEP 0: ULP */}
            {step === 0 && (
              <div className="divide-y">
                <ListRow
                  label="All"
                  count={totalAll}
                  onClick={async () => {
                    setSelectedUlp('')
                    setSelectedExec('All')
                    setSelectedDateKey('All')
                    await loadRowsForUlp('')
                    setStep(1)
                  }}
                />

                {ulpList.map(item => (
                  <ListRow
                    key={item.ulp}
                    label={item.ulp}
                    count={item.count}
                    onClick={async () => {
                      setSelectedUlp(item.ulp)
                      setSelectedExec('All')
                      setSelectedDateKey('All')
                      await loadRowsForUlp(item.ulp)
                      setStep(1)
                    }}
                  />
                ))}

                {!loading && ulpList.length === 0 && (
                  <div className="text-gray-500 py-6 px-2">
                    Belum ada data pemeliharaan.
                  </div>
                )}
              </div>
            )}

            {/* STEP 1: DIEKSEKUSI */}
            {step === 1 && (
              <div className="divide-y">
                {execList.map(item => (
                  <ListRow
                    key={item.name}
                    label={item.name}
                    count={item.count}
                    onClick={() => {
                      setSelectedExec(item.name)
                      setSelectedDateKey('All')
                      setStep(2)
                    }}
                  />
                ))}

                {!loading && rowsScope.length === 0 && (
                  <div className="text-gray-500 py-6 px-2">
                    Belum ada data untuk pilihan ini.
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: TANGGAL (dd/mm/yyyy) */}
            {step === 2 && (
              <div className="divide-y">
                {dateList.map(item => (
                  <ListRow
                    key={item.key}
                    label={item.label}
                    count={item.count}
                    onClick={() => {
                      setSelectedDateKey(item.key)
                      setStep(3)
                    }}
                  />
                ))}

                {!loading && rowsByExec.length === 0 && (
                  <div className="text-gray-500 py-6 px-2">
                    Belum ada data untuk eksekusi ini.
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: DATA (list model AppSheet) */}
            {step === 3 && (
              <div>
                {rowsFinal.map(r => (
                  <DataRowItem key={r.row} r={r} />
                ))}

                {!loading && rowsFinal.length === 0 && (
                  <div className="text-gray-500 py-6 px-2">
                    Belum ada data untuk tanggal ini.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ✅ FLOATING BUTTON TAMBAH DATA */}
      <button
        type="button"
        onClick={() => router.push('/PEMELIHARAAN-JTM-Form')}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#2FA6DE] text-white shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition"
        title="Tambah Data">
        <IoAdd size={28} />
      </button>
    </div> 
  ) 
}
