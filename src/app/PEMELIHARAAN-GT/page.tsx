'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  IoArrowBack,
  IoChevronForward,
  IoCreateOutline,
  IoLocationOutline,
  IoAdd,
  IoSearch,
  IoRefresh,
  IoChevronBack,
  IoChevronForward as IoChevronForward2,
} from 'react-icons/io5'

import plnKecil from '@/app/assets/plnup3/plnkecil.svg'
import bg from '@/app/assets/plnup3/bgnogradient.png'

/**
 * IMPORTANT:
 * - Pastikan ini adalah URL Apps Script yang punya endpoint `type=pemeliharaan`
 */
const API_URL =
  'https://script.google.com/macros/s/AKfycbzRDMaCMfNqLKd_wqrQBiHj074VPKruyxW0tJkkd6UL621eoA374IlF9lamc1JX1dBJ/exec'

// Sesuaikan dengan nama folder form kamu (case-sensitive terhadap folder app)
const ROUTE_FORM = '/PEMELIHARAAN-GT-Form'
const ROUTE_MENU = '/menu'

type ULPItem = { ulp: string; count: number }

type PemRow = {
  row: number
  up3?: string
  ulp?: string
  tanggalHar?: string
  namaGardu?: string
  longlat?: string
  kapasitas?: any
  fasa?: string
  zona?: string
  section?: string
  penyulang?: string

  alasanText?: string
  pemeliharaanText?: string
  dieksekusiOleh?: string
  jumlahItemMaterial?: any

  konstruksi?: string
  fuselinkMax?: any
  bebanTrMax?: any

  fotoSebelum1?: string
  fotoSebelum2?: string
  fotoProses?: string
  fotoSesudah1?: string
  fotoSesudah2?: string
  fotoBA?: string
}

type ExecItem = { name: string; count: number }
type DateItem = { key: string; label: string; count: number; ts: number }

function mapsLinkFromKoordinat(koor: string) {
  if (!koor) return ''
  const cleaned = koor.replace(/\s+/g, '')
  if (!cleaned.includes(',')) return ''
  return `https://www.google.com/maps?q=${encodeURIComponent(cleaned)}`
}

function mapsEmbedFromKoordinat(koor: string) {
  const url = mapsLinkFromKoordinat(koor)
  if (!url) return ''
  return `${url}&output=embed`
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

  // label M/D/YYYY biar mirip screenshot (2/26/2026)
  return {
    key: `${yy}-${mm}-${dd}`,
    label: `${d.getMonth() + 1}/${d.getDate()}/${yy}`,
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
      className="w-full flex items-center justify-between py-4 border-b hover:bg-gray-50 transition px-3"
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

/**
 * ✅ FIX: wrapper BUKAN <button> supaya tidak ada nested button.
 */
function DataRowItem({ r, onOpen }: { r: PemRow; onOpen: () => void }) {
  const thumb = r.fotoSebelum1 || r.fotoProses || r.fotoSesudah1 || r.fotoBA || ''
  const title = String(r.namaGardu || r.penyulang || '-').trim()
  const line2 = String(r.pemeliharaanText || '').trim()
  const line2OneLine = line2 ? line2.replace(/\n+/g, ', ') : '-'
  const exec = String(r.dieksekusiOleh || '-').trim()
  const gmaps = mapsLinkFromKoordinat(String(r.longlat || ''))

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className="w-full border-b px-3 py-3 flex gap-4 text-left hover:bg-gray-50 cursor-pointer"
    >
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
        <div className="font-semibold text-[15px] truncate">{title}</div>
        <div className="text-[13px] text-gray-700 truncate">- {line2OneLine}</div>
      </div>

      {/* RIGHT */}
      <div className="shrink-0 flex flex-col items-end justify-between">
        <div className="text-[12px] text-gray-700 font-medium">{exec}</div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-gray-600 hover:text-black"
            title="Edit (coming soon)"
            onClick={e => {
              e.stopPropagation()
              // TODO: edit handler
            }}
          >
            <IoCreateOutline size={18} />
          </button>

          {gmaps ? (
            <a
              onClick={e => e.stopPropagation()}
              href={gmaps}
              target="_blank"
              rel="noreferrer"
              className="text-gray-600 hover:text-black"
              title="Buka lokasi"
            >
              <IoLocationOutline size={18} />
            </a>
          ) : (
            <span className="text-gray-300" title="Koordinat kosong">
              <IoLocationOutline size={18} />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value?: any }) {
  const v =
    value === undefined || value === null || String(value).trim() === ''
      ? '-'
      : String(value)
  return (
    <div className="mb-5">
      <div className="text-[10px] tracking-wide text-gray-500 uppercase">{label}</div>
      <div className="text-[14px] font-medium text-gray-900">{v}</div>
    </div>
  )
}

function PhotoBlock({ label, url }: { label: string; url?: string }) {
  if (!url) return null
  return (
    <div className="mb-6">
      <div className="text-[10px] tracking-wide text-gray-500 uppercase mb-2">{label}</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={label} className="w-[180px] max-w-full rounded-md border bg-white" />
    </div>
  )
}

function asRows(json: any): PemRow[] {
  if (Array.isArray(json)) return json
  if (json && Array.isArray(json.data)) return json.data
  return []
}

export default function Page() {
  const router = useRouter()

  // 0=ULP, 1=EXEC, 2=DATE, 3=DATA, 4=DETAIL
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0)

  const [selectedUlp, setSelectedUlp] = useState<string>('') // '' = ALL
  const [selectedExec, setSelectedExec] = useState<string>('All')
  const [selectedDateKey, setSelectedDateKey] = useState<string>('All')

  const [allRows, setAllRows] = useState<PemRow[]>([])
  const [loading, setLoading] = useState(false)
  const [errMsg, setErrMsg] = useState('')

  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')

  const [detailIndex, setDetailIndex] = useState(0)

  const fetchAllRows = async () => {
    setLoading(true)
    setErrMsg('')
    try {
      const res = await fetch(`${API_URL}?type=pemeliharaan&_=${Date.now()}`, { cache: 'no-store' })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const rows = asRows(json)
      setAllRows(rows)
    } catch (e: any) {
      setAllRows([])
      setErrMsg(e?.message || 'Gagal mengambil data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllRows()
  }, [])

  // ✅ ULP list + count selalu dari data real (bukan endpoint terpisah)
  const ulpList: ULPItem[] = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of allRows) {
      const u = String(r.ulp || '').trim()
      if (!u) continue
      map.set(u, (map.get(u) || 0) + 1)
    }
    return Array.from(map.entries())
      .map(([ulp, count]) => ({ ulp, count }))
      .sort((a, b) => String(a.ulp).localeCompare(String(b.ulp)))
  }, [allRows])

  const totalAll = useMemo(() => allRows.length, [allRows])

  const rowsScope = useMemo(() => {
    if (!selectedUlp) return allRows
    return allRows.filter(r => String(r.ulp || '').trim() === selectedUlp)
  }, [allRows, selectedUlp])

  const execList: ExecItem[] = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rowsScope) {
      const key = String(r.dieksekusiOleh || '').trim()
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
    return rowsScope.filter(r => String(r.dieksekusiOleh || '').trim() === selectedExec)
  }, [rowsScope, selectedExec])

  const dateList: DateItem[] = useMemo(() => {
    const map = new Map<string, { label: string; count: number; ts: number }>()
    for (const r of rowsByExec) {
      const raw = String(r.tanggalHar || '').trim()
      if (!raw) continue
      const normd = dateKeyAndLabel(raw)

      const prev = map.get(normd.key)
      if (!prev) map.set(normd.key, { label: normd.label, count: 1, ts: normd.ts })
      else map.set(normd.key, { label: prev.label, count: prev.count + 1, ts: prev.ts || normd.ts })
    }

    const arr = Array.from(map.entries())
      .map(([key, v]) => ({ key, label: v.label, count: v.count, ts: v.ts }))
      .sort((a, b) => (b.ts || 0) - (a.ts || 0))

    const total = arr.reduce((x, y) => x + y.count, 0)
    return [{ key: 'All', label: 'All', count: total, ts: 0 }, ...arr]
  }, [rowsByExec])

  const rowsFinal = useMemo(() => {
    let out = rowsByExec

    if (selectedDateKey && selectedDateKey !== 'All') {
      out = out.filter(r => {
        const raw = String(r.tanggalHar || '').trim()
        if (!raw) return false
        const normd = dateKeyAndLabel(raw)
        return normd.key === selectedDateKey
      })
    }

    // search hanya di step 3
    if (step === 3 && search.trim()) {
      const q = search.trim().toLowerCase()
      out = out.filter(r => {
        const t =
          `${r.namaGardu || ''} ${r.penyulang || ''} ${r.pemeliharaanText || ''} ${r.dieksekusiOleh || ''}`.toLowerCase()
        return t.includes(q)
      })
    }

    return out
  }, [rowsByExec, selectedDateKey, search, step])

  const filteredUlpList = useMemo(() => {
    if (!search.trim() || step !== 0) return ulpList
    const q = search.trim().toLowerCase()
    return ulpList.filter(x => String(x.ulp || '').toLowerCase().includes(q))
  }, [ulpList, search, step])

  const filteredExecList = useMemo(() => {
    if (!search.trim() || step !== 1) return execList
    const q = search.trim().toLowerCase()
    return execList.filter(x => String(x.name || '').toLowerCase().includes(q))
  }, [execList, search, step])

  const filteredDateList = useMemo(() => {
    if (!search.trim() || step !== 2) return dateList
    const q = search.trim().toLowerCase()
    return dateList.filter(x => String(x.label || '').toLowerCase().includes(q))
  }, [dateList, search, step])

  const handleBackOneButton = () => {
    setSearchOpen(false)
    setSearch('')

    if (step === 4) {
      setStep(3)
      return
    }
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
      setSelectedUlp('')
      setStep(0)
      return
    }

    router.push(ROUTE_MENU)
  }

  const refreshNow = async () => {
    await fetchAllRows()
  }

  const openDetailAt = (idx: number) => {
    setDetailIndex(idx)
    setStep(4)
  }

  const detailRow = rowsFinal[detailIndex]

  const prevDetail = () => {
    if (!rowsFinal.length) return
    setDetailIndex(i => (i - 1 + rowsFinal.length) % rowsFinal.length)
  }

  const nextDetail = () => {
    if (!rowsFinal.length) return
    setDetailIndex(i => (i + 1) % rowsFinal.length)
  }

  return (
    <div className="h-screen bg-white font-poppins flex flex-col relative">
      {/* HEADER */}
      <div className="h-[56px] px-4 flex items-center justify-between border-b bg-white">
        <div className="flex items-center gap-3">
          <button onClick={handleBackOneButton}>
            <IoArrowBack size={22} />
          </button>
          <Image src={plnKecil} alt="pln" width={28} />
          <h1 className="font-medium">PEMELIHARAAN GT</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setSearchOpen(s => !s)
              setSearch('')
            }}
            title="Search"
          >
            <IoSearch size={20} />
          </button>
          <button type="button" onClick={refreshNow} title="Refresh">
            <IoRefresh size={20} />
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      {searchOpen && step !== 4 && (
        <div className="px-4 py-2 border-b bg-white">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Cari..."
          />
        </div>
      )}

      {/* ERROR BAR */}
      {!!errMsg && (
        <div className="px-4 py-2 border-b bg-red-50 text-red-700 text-sm">
          {errMsg}
        </div>
      )}

      {/* LIST/DETAIL BODY */}
      <main className="flex-1 overflow-hidden">
        {/* DETAIL VIEW */}
        {step === 4 && detailRow ? (
          <div className="h-full relative">
            <div className="absolute inset-0">
              <Image src={bg} alt="bg" fill className="object-cover" />
              <div className="absolute inset-0 bg-white/70" />
            </div>

            <div className="relative h-full overflow-y-auto">
              <div className="max-w-[520px] mx-auto bg-white min-h-full px-6 py-6 shadow-sm">
                <Field label="UP3" value={detailRow.up3} />
                <Field label="ULP" value={detailRow.ulp} />
                <Field label="TANGGAL HAR GARDU" value={detailRow.tanggalHar} />
                <Field label="NAMA GARDU" value={detailRow.namaGardu} />

                <div className="mb-6">
                  <div className="text-[10px] tracking-wide text-gray-500 uppercase mb-2">LONGLAT</div>
                  {detailRow.longlat ? (
                    <div className="w-full rounded-md overflow-hidden border bg-white">
                      <iframe
                        title="map"
                        src={mapsEmbedFromKoordinat(String(detailRow.longlat))}
                        className="w-full h-[160px]"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">-</div>
                  )}
                </div>

                <Field label="KAPASITAS" value={detailRow.kapasitas} />
                {detailRow.konstruksi !== undefined && <Field label="KONSTRUKSI" value={detailRow.konstruksi} />}
                {detailRow.fuselinkMax !== undefined && <Field label="FUSELINK MAX" value={detailRow.fuselinkMax} />}
                {detailRow.bebanTrMax !== undefined && <Field label="BEBAN TR MAX" value={detailRow.bebanTrMax} />}

                <Field label="FASA" value={detailRow.fasa} />
                <Field label="PENYULANG" value={detailRow.penyulang} />
                <Field label="ZONA PROTEKSI" value={detailRow.zona} />
                <Field label="SECTION" value={detailRow.section} />

                <div className="mt-6" />

                <Field label="MENGAPA GARDU DIPELIHARA ?" value={detailRow.alasanText} />
                <Field label="APA YANG DILAKUKAN ?" value={detailRow.pemeliharaanText} />
                <Field label="DIEKSEKUSI OLEH" value={detailRow.dieksekusiOleh} />
                <Field label="JUMLAH ITEM MATERIAL" value={detailRow.jumlahItemMaterial} />

                <div className="mt-6" />

                <PhotoBlock label="FOTO SEBELUM (1)" url={detailRow.fotoSebelum1} />
                <PhotoBlock label="FOTO SEBELUM (2)" url={detailRow.fotoSebelum2} />
                <PhotoBlock label="FOTO PROSES PEKERJAAN" url={detailRow.fotoProses} />
                <PhotoBlock label="FOTO SESUDAH (1)" url={detailRow.fotoSesudah1} />
                <PhotoBlock label="FOTO SESUDAH (2)" url={detailRow.fotoSesudah2} />
                <PhotoBlock label="LAMPIRAN BA" url={detailRow.fotoBA} />
              </div>
            </div>

            <button
              type="button"
              onClick={prevDetail}
              className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center"
              title="Prev"
            >
              <IoChevronBack size={20} />
            </button>

            <button
              type="button"
              onClick={nextDetail}
              className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center"
              title="Next"
            >
              <IoChevronForward2 size={20} />
            </button>

            <button
              type="button"
              onClick={() => router.push(ROUTE_FORM)}
              className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#2FA6DE] text-white shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition"
              title="Edit / Tambah"
            >
              <IoCreateOutline size={26} />
            </button>
          </div>
        ) : (
          // LIST VIEW
          <div className="h-full overflow-hidden">
            {loading && (
              <div className="h-1 w-full bg-gray-200">
                <div className="h-1 w-1/3 bg-gray-500 animate-pulse" />
              </div>
            )}

            <div className="h-full overflow-y-auto">
              {/* STEP 0: ULP */}
              {step === 0 && (
                <div className="divide-y">
                  <ListRow
                    label="All"
                    count={totalAll}
                    onClick={() => {
                      setSelectedUlp('')
                      setSelectedExec('All')
                      setSelectedDateKey('All')
                      setStep(1)
                    }}
                  />

                  {filteredUlpList.map(item => (
                    <ListRow
                      key={item.ulp}
                      label={item.ulp}
                      count={item.count}
                      onClick={() => {
                        setSelectedUlp(item.ulp)
                        setSelectedExec('All')
                        setSelectedDateKey('All')
                        setStep(1)
                      }}
                    />
                  ))}

                  {!loading && totalAll === 0 && (
                    <div className="text-gray-500 py-6 px-3">Belum ada data pemeliharaan GT.</div>
                  )}
                </div>
              )}

              {/* STEP 1: DIEKSEKUSI */}
              {step === 1 && (
                <div className="divide-y">
                  {filteredExecList.map(item => (
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
                    <div className="text-gray-500 py-6 px-3">Belum ada data untuk pilihan ini.</div>
                  )}
                </div>
              )}

              {/* STEP 2: TANGGAL */}
              {step === 2 && (
                <div className="divide-y">
                  {filteredDateList.map(item => (
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
                    <div className="text-gray-500 py-6 px-3">Belum ada data untuk eksekusi ini.</div>
                  )}
                </div>
              )}

              {/* STEP 3: DATA LIST */}
              {step === 3 && (
                <div>
                  {rowsFinal.map((r, idx) => (
                    <DataRowItem key={r.row ?? idx} r={r} onOpen={() => openDetailAt(idx)} />
                  ))}

                  {!loading && rowsFinal.length === 0 && (
                    <div className="text-gray-500 py-6 px-3">Belum ada data untuk filter ini.</div>
                  )}
                </div>
              )}
            </div>

            {/* FLOATING + */}
            <button
              type="button"
              onClick={() => router.push(ROUTE_FORM)}
              className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#2FA6DE] text-white shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition"
              title="Tambah Data"
            >
              <IoAdd size={28} />
            </button>
          </div>
        )}
      </main>
    </div>
  )
}