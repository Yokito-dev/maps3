'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { IoArrowBack, IoChevronDown } from 'react-icons/io5'
import bg from '@/app/assets/plnup3/bgnogradient.png'
import plnKecil from '@/app/assets/plnup3/plnkecil.svg'
import { useRouter } from 'next/navigation'

const API_URL =
  'https://script.google.com/macros/s/AKfycbxIqjDk5e3ot5xhx7yACC9K2gVZe1SkJZb_Ns3-vT_5YMzp5D__60CD8hbvnlMDVD0uUQ/exec'

type Row = {
  up3: string
  ulp: string
  namaGardu: string
}

const INITIAL_FORM = {
  up3: 'UP3 MAKASSAR SELATAN',
  ulp: '',
  namaGardu: '',
  scheduleDate: '',
  statusMilik: '',
}

const CACHE_KEY = 'plnup3_master_rows_v1'
const CACHE_TTL = 1000 * 60 * 60 // 1 jam

export default function Page() {
  const router = useRouter()
  const [data, setData] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [progress, setProgress] = useState<'open' | 'close' | null>(null)

  const [form, setForm] = useState(INITIAL_FORM)

  const change = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    // 1) coba load dari cache biar langsung muncul (ga nunggu fetch)
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached) as { t: number; rows: Row[] }
        if (Date.now() - parsed.t < CACHE_TTL) {
          setData(parsed.rows.filter(r => r.up3 === INITIAL_FORM.up3))
          setLoading(false)
        }
      }
    } catch {}

    // 2) tetap fetch terbaru (refresh cache) di background
    const controller = new AbortController()

    fetch(API_URL, { signal: controller.signal })
      .then(res => res.json())
      .then((rows: Row[]) => {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), rows }))
        } catch {}

        setData(rows.filter(r => r.up3 === INITIAL_FORM.up3))
        setLoading(false)
      })
      .catch(() => {
        alert('Gagal konek ke Spreadsheet')
        setLoading(false)
      })

    return () => controller.abort()
  }, [])

  const ULP_LIST = useMemo(() => [...new Set(data.map(d => d.ulp).filter(Boolean))], [data])

  const GARDU_BY_ULP = useMemo(() => {
    const m: Record<string, string[]> = {}
    data.forEach(d => {
      if (!d.ulp || !d.namaGardu) return
      if (!m[d.ulp]) m[d.ulp] = []
      if (!m[d.ulp].includes(d.namaGardu)) m[d.ulp].push(d.namaGardu)
    })
    return m
  }, [data])

  const isFormValid = Boolean(
    form.ulp && form.namaGardu && form.scheduleDate && form.statusMilik && progress
  )

  const handleSubmit = async () => {
    if (!isFormValid || submitting) return
    setSubmitting(true)

    try {
      const formBody = new URLSearchParams({
        up3: form.up3,
        ulp: form.ulp,
        namaGardu: form.namaGardu,
        startDate: form.scheduleDate,
        endDate: form.scheduleDate,
        colour: progress === 'open' ? 'Green' : 'Red',
        progress: progress === 'open' ? 'OPEN INSPEKSI' : 'CLOSE INSPEKSI',
        statusMilik: form.statusMilik,
      }).toString()

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody,
      })

      const json = await res.json()

      if (json.status !== 'success') throw new Error(json.message)

      alert(`Schedule tersimpan\nID: ${json.id}`)

      // ✅ tetap di halaman, reset form
      setForm(INITIAL_FORM)
      setProgress(null)
    } catch (err: any) {
      console.error(err)
      alert('Gagal menyimpan data:\n' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="h-screen overflow-hidden font-poppins flex flex-col">
      {/* BACKGROUND */}
      <div className="fixed inset-0 -z-10">
        <Image src={bg} alt="Background" fill className="object-cover" priority />
      </div>
      <div className="fixed inset-0 -z-10 bg-gradient-to-t from-[#165F67]/70 via-[#67C2E9]/30 to-transparent backdrop-blur-sm" />

      {/* HEADER */}
      <div className="px-4 pt-3">
        <div className="bg-white rounded-full shadow px-6 py-2 flex items-center gap-3">
          <button onClick={() => router.push('/menu')}>
            <IoArrowBack size={22} />
          </button>
          <Image src={plnKecil} alt="pln" width={34} />
          <h1 className="font-medium">Schedule GH GB MC Form</h1>
        </div>
      </div>

      {/* CONTENT */}
      <main className="flex-1 flex justify-center items-start px-0 pt-4 md:p-4 overflow-hidden">
        <div
          className="
            bg-white shadow-xl w-full
            flex flex-col h-full overflow-hidden
            rounded-t-[28px] rounded-b-none
            px-5 py-6
            md:h-[82vh]
            md:rounded-3xl
            md:p-10
            md:max-w-[1200px]
          "
        >
          <div className="flex-1 overflow-y-auto pr-2">
            {loading ? (
              <div className="flex h-full w-full items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-[#2FA6DE] border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-500 text-sm font-medium">Memuat data...</p>
                </div>
              </div>
            ) : (
              <div className="min-h-full md:flex md:items-center">
                <div className="grid w-full grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                  {/* ================= KIRI ================= */}
                  <div className="flex flex-col gap-6">
                    <Input label="UP3" value={form.up3} readOnly />

                    <PopupSelect
                      label="ULP"
                      value={form.ulp}
                      options={ULP_LIST}
                      onSave={v => {
                        change('ulp', v)
                        change('namaGardu', '')
                      }}
                      onClear={() => {
                        change('ulp', '')
                        change('namaGardu', '')
                      }}
                      searchable={false}
                    />

                    <SearchableAddSelect
                      label="Nama Gardu"
                      value={form.namaGardu}
                      options={GARDU_BY_ULP[form.ulp] || []}
                      disabled={!form.ulp}
                      onSave={v => change('namaGardu', v)}
                    />

                    <PopupSelect
                      label="Status Milik"
                      value={form.statusMilik}
                      options={['Milik Pelanggan', 'Milik PLN']}
                      onSave={v => change('statusMilik', v)}
                      onClear={() => change('statusMilik', '')}
                      searchable={false}
                    />
                  </div>

                  {/* ================= KANAN ================= */}
                  <div className="flex flex-col gap-6">
                    {/* Schedule Date */}
                    <div>
                      <label className="text-sm font-semibold">
                        Schedule Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={form.scheduleDate}
                        onChange={e => change('scheduleDate', e.target.value)}
                        className={`mt-2 w-full py-3 px-5 border-2 border-[#2FA6DE] rounded-full ${
                          form.scheduleDate ? 'text-black' : 'text-gray-400'
                        }`}
                      />
                    </div>

                    {/* PROGRESS */}
                    <div>
                      <label className="text-sm font-semibold">
                        Progress <span className="text-red-500">*</span>
                      </label>

                      <div className="flex gap-6 mt-3">
                        {[
                          { k: 'open', l: 'Open Inspeksi', c: 'green' as const },
                          { k: 'close', l: 'Close Inspeksi', c: 'red' as const },
                        ].map(i => (
                          <div
                            key={i.k}
                            onClick={() => setProgress(i.k as any)}
                            className="flex items-center gap-3 cursor-pointer"
                          >
                            <div
                              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${
                                progress === i.k
                                  ? i.c === 'green'
                                    ? 'bg-green-500 border-green-500'
                                    : 'bg-red-500 border-red-500'
                                  : 'border-gray-400'
                              }`}
                            >
                              {progress === i.k && <span className="text-white text-lg">✓</span>}
                            </div>
                            <span className="font-medium">{i.l}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ACTION */}
                    <div className="flex gap-4 mt-8 items-end">
                      <button
                        onClick={() => router.push('/schedule-gh-gb-mc')}
                        className="flex-1 py-3 bg-red-500 text-white rounded-full"
                        disabled={submitting}
                      >
                        Cancel
                      </button>

                      <button
                        onClick={handleSubmit}
                        disabled={!isFormValid || submitting}
                        className={`flex-1 py-3 rounded-full text-white ${
                          isFormValid && !submitting
                            ? 'bg-[#2FA6DE]'
                            : 'bg-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {submitting ? 'Menyimpan...' : 'Submit'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* END */}
          </div>
        </div>
      </main>
    </div>
  )
}

/* ================= COMPONENTS ================= */

function Input({
  label,
  value,
  type = 'text',
  onChange,
  readOnly = false,
}: {
  label: string
  value: string
  type?: string
  readOnly?: boolean
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div>
      <label className="text-sm font-semibold">
        {label} <span className="text-red-500">*</span>
      </label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={onChange}
        className={`mt-2 w-full py-3 px-5 border-2 border-[#2FA6DE] rounded-full ${
          readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
        }`}
      />
    </div>
  )
}

type PopupSelectProps = {
  label: string
  value: string
  options: string[]
  onSave: (v: string) => void
  onClear: () => void
  disabled?: boolean
  searchable?: boolean
}

function PopupSelect({
  label,
  value,
  options,
  onSave,
  onClear,
  disabled = false,
  searchable = true,
}: PopupSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const list = options
      .filter(o => typeof o === 'string')
      .map(o => o.trim())
      .filter(Boolean)

    if (!searchable) return list
    return list.filter(o => o.toLowerCase().includes(search.toLowerCase()))
  }, [options, search, searchable])

  return (
    <>
      {/* FIELD */}
      <div
        onClick={() => !disabled && setOpen(true)}
        className={`${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <label className="text-sm font-semibold">
          {label} <span className="text-red-500">*</span>
        </label>
        <div className="mt-2 px-5 py-3 border-2 border-[#2FA6DE] rounded-full flex justify-between items-center">
          <span className={value ? '' : 'text-gray-400'}>{value || `Pilih ${label}`}</span>
          <IoChevronDown />
        </div>
      </div>

      {/* POPUP */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white p-6 rounded-xl w-[700px] max-h-[75vh] flex flex-col"
          >
            <h2 className="font-bold text-lg mb-3">{label}</h2>

            {searchable && (
              <input
                placeholder="Cari..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="mb-3 px-4 py-2 border rounded-lg"
              />
            )}

            <div className="overflow-y-auto flex-1">
              {filtered.map(o => {
                const selected = o === value
                return (
                  <div
                    key={o}
                    onClick={() => {
                      onSave(o)
                      setOpen(false)
                      setSearch('')
                    }}
                    className={`py-2 px-3 rounded-lg cursor-pointer ${
                      selected ? 'bg-[#E8F5FB] text-blue-600 font-semibold' : 'hover:bg-gray-100'
                    }`}
                  >
                    {o}
                  </div>
                )
              })}

              {filtered.length === 0 && (
                <div className="text-gray-400 text-sm py-4 text-center">Tidak ada data</div>
              )}
            </div>

            <button
              onClick={() => {
                onClear()
                setOpen(false)
                setSearch('')
              }}
              className="text-red-500 mt-3"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </>
  )
}

type SearchableAddSelectProps = {
  label: string
  value: string
  options: string[]
  onSave: (v: string) => void
  disabled?: boolean
}

function SearchableAddSelect({
  label,
  value,
  options,
  onSave,
  disabled = false,
}: SearchableAddSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return options
      .filter(o => typeof o === 'string')
      .map(o => o.trim())
      .filter(Boolean)
      .filter(o => o.toLowerCase().includes(search.toLowerCase()))
  }, [options, search])

  return (
    <>
      {/* FIELD */}
      <div
        onClick={() => !disabled && setOpen(true)}
        className={`${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <label className="text-sm font-semibold">
          {label} <span className="text-red-500">*</span>
        </label>
        <div className="mt-2 px-5 py-3 border-2 border-[#2FA6DE] rounded-full flex justify-between items-center bg-white">
          <span className={value ? '' : 'text-gray-400'}>{value || `Pilih ${label}`}</span>
          <IoChevronDown />
        </div>
      </div>

      {/* POPUP */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white p-6 rounded-xl w-[700px] max-h-[75vh] flex flex-col"
          >
            <h2 className="font-bold text-lg mb-3">{label}</h2>

            <input
              placeholder={`Cari / tambah ${label}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="mb-3 px-4 py-2 border rounded-lg"
            />

            <div className="overflow-y-auto flex-1">
              {filtered.map(o => {
                const selected = o === value
                return (
                  <div
                    key={o}
                    onClick={() => {
                      onSave(o)
                      setOpen(false)
                      setSearch('')
                    }}
                    className={`py-2 px-3 rounded-lg cursor-pointer ${
                      selected ? 'bg-[#E8F5FB] text-blue-600 font-semibold' : 'hover:bg-gray-100'
                    }`}
                  >
                    {o}
                  </div>
                )
              })}

              {filtered.length === 0 && (
                <div className="text-gray-400 text-sm py-4 text-center">Tidak ada data</div>
              )}
            </div>

            {/* tombol tambah jika tidak ada hasil */}
            {filtered.length === 0 && search.trim() && (
              <div className="border-t pt-3 text-center">
                <button
                  onClick={() => {
                    onSave(search.trim())
                    setOpen(false)
                    setSearch('')
                  }}
                  className="px-4 py-2 bg-[#2FA6DE] text-white rounded-lg"
                >
                  Tambah "{search.trim()}"
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setOpen(false)
                setSearch('')
              }}
              className="text-red-500 mt-3"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </>
  )
}
