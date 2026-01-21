'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { IoArrowBack, IoChevronDown } from 'react-icons/io5'
import bg from '@/app/assets/plnup3/bgnogradient.png'
import plnKecil from '@/app/assets/plnup3/plnkecil.svg'
import { useRouter } from 'next/navigation'

const API_URL =
  'https://script.google.com/macros/s/AKfycbyeZGyvtK9fzLEMXpjJPVRiRGFC8_9G6TVl9P8oA4-fAQoZlSG6HY5EnHFvatbFgEuQDA/exec'

type Row = {
  up3: string
  ulp: string
  nama_gardu: string
}

export default function Page() {
  const router = useRouter()
  const [data, setData] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    up3: 'UP3 MAKASSAR SELATAN',
    ulp: '',
    namaGardu: '',
    scheduleDate: '',
    statusMilik: '',
  })

  const [progress, setProgress] = useState<'open' | 'close' | null>(null)

  const change = (k: keyof typeof form, v: string) =>
    setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    fetch(API_URL)
      .then(r => r.text())
      .then(t => {
        const json = JSON.parse(t)
        const rows: Row[] = Array.isArray(json) ? json : json.data
        setData(rows.filter(r => r.up3 === form.up3))
        setLoading(false)
      })
      .catch(() => {
        alert('Gagal konek ke Spreadsheet')
        setLoading(false)
      })
  }, [])

  const ULP_LIST = useMemo(
    () => [...new Set(data.map(d => d.ulp).filter(Boolean))],
    [data]
  )

  const GARDU_BY_ULP = useMemo(() => {
    const m: Record<string, string[]> = {}
    data.forEach(d => {
      if (!m[d.ulp]) m[d.ulp] = []
      if (!m[d.ulp].includes(d.nama_gardu)) m[d.ulp].push(d.nama_gardu)
    })
    return m
  }, [data])

  const isFormValid =
    form.ulp &&
    form.namaGardu &&
    form.scheduleDate &&
    form.statusMilik &&
    progress

  if (loading) return <div className="p-6">Loading data dari Spreadsheet...</div>

  return (
    /* PAGE root preserved exactly for desktop; mobile-only scrolling & ordering applied inside */
    <div className="font-poppins flex flex-col h-[100dvh] overflow-hidden">

      {/* BACKGROUND — fixed */}
      <div className="fixed inset-0 -z-10">
        <Image src={bg} alt="bg" fill className="object-cover" />
      </div>

      {/* HEADER — preserved */}
      <div className="px-4 pt-3">
        <div className="bg-white rounded-full shadow-lg px-4 py-2 flex items-center gap-3">
          <button
            onClick={() => router.push('/menu')}
            className="w-10 h-10 rounded-full hover:bg-gray-200 flex items-center justify-center"
          >
            <IoArrowBack size={22} />
          </button>
          <Image src={plnKecil} alt="pln" width={32} height={32} />
          <h1 className="font-medium text-sm sm:text-base">
            Schedule GH GB MC Form
          </h1>
        </div>
      </div>

      {/* MAIN — desktop visual unchanged; white container kept same for md+.
          Mobile: white container becomes scrollable area and element order switches via order-* */}
      <main className="flex justify-center items-start p-4 h-full">
        <div
          className="
           bg-white rounded-3xl shadow-xl
           p-6 md:p-10
           w-full max-w-[1200px]

           /* MOBILE: make the white container a bounded scroll area (does not affect md+) */
           h-[calc(100dvh-140px)] overflow-y-auto

           /* DESKTOP: unchanged */
           md:h-[82vh] md:overflow-visible
         "
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6 md:gap-y-10">

            {/* UP3 (mobile order 1, desktop default position preserved) */}
            <div className="order-1 md:order-none">
              <Input label="UP3" value={form.up3} readOnly />
            </div>

            {/* Status Milik (mobile order 4; desktop stays in its column) */}
            <div className="order-4 md:order-none">
              <PopupSelect
                label="Status Milik"
                value={form.statusMilik}
                options={['PLN', 'Pelanggan']}
                onSave={v => change('statusMilik', v)}
                onClear={() => change('statusMilik', '')}
              />
            </div>

            {/* ULP (mobile order 2) */}
            <div className="order-2 md:order-none">
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
              />
            </div>

            {/* Progress (mobile order 6; desktop original column preserved) */}
            <div className="order-6 md:order-none">
              <label className="text-sm font-semibold">
                Progress <span className="text-red-500">*</span>
              </label>

              <div className="flex gap-6 mt-4">
                {[
                  { k: 'open', l: 'Open Inspeksi', c: 'green' },
                  { k: 'close', l: 'Close Inspeksi', c: 'red' },
                ].map(i => (
                  <div
                    key={i.k}
                    onClick={() => setProgress(i.k as any)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <div
                      className={`w-12 h-12 rounded-full border-2 flex items-center justify-center
                        ${
                          progress === i.k
                            ? i.c === 'green'
                              ? 'bg-green-500 border-green-500'
                              : 'bg-red-500 border-red-500'
                            : 'border-gray-400'
                        }`}
                    >
                      {progress === i.k && (
                        <span className="text-white text-lg">✓</span>
                      )}
                    </div>
                    <span className="font-medium">{i.l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Nama Gardu (mobile order 3) */}
            <div className="order-3 md:order-none">
              <PopupSelect
                label="Nama Gardu"
                value={form.namaGardu}
                options={GARDU_BY_ULP[form.ulp] || []}
                disabled={!form.ulp}
                placeholder="Pilih ULP terlebih dahulu"
                onSave={v => change('namaGardu', v)}
                onClear={() => change('namaGardu', '')}
              />
            </div>

            {/* placeholder to keep desktop grid identical — keep as in original */}
            <div className="order-[99] md:order-none" />

            {/* Schedule Date (mobile order 5). Add small symmetric vertical padding on mobile only */}
            <div className="order-5 md:order-none py-2 md:py-0">
              <Input
                label="Schedule Date"
                type="date"
                value={form.scheduleDate}
                onChange={e => change('scheduleDate', e.target.value)}
              />
            </div>

            {/* Buttons (mobile order 7) */}
            <div className="order-7 md:order-none flex gap-6 items-end">
              <button
                onClick={() => router.push('/schedule-gh-gb-mc')}
                className="px-10 py-3 rounded-full bg-red-500 text-white hover:bg-red-600"
              >
                Cancel
              </button>

              <button
                disabled={!isFormValid}
                className={`px-10 py-3 rounded-full text-white
                  ${
                    isFormValid
                      ? 'bg-[#2FA6DE]'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
              >
                Submit
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}

/* ================= COMPONENTS ================= */

function PopupSelect({
  label,
  value,
  options,
  onSave,
  onClear,
  disabled,
  placeholder,
}: any) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div
        onClick={() => !disabled && setOpen(true)}
        className={disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      >
        <label className="text-sm font-semibold">
          {label} <span className="text-red-500">*</span>
        </label>

        <div className="mt-2 px-5 py-3 border-2 border-[#2FA6DE] rounded-full flex items-center justify-between">
          <span className={value ? '' : 'text-gray-400'}>
            {value || placeholder || `Pilih ${label}`}
          </span>
          <IoChevronDown />
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white p-6 rounded-xl w-[90vw] max-w-[700px] max-h-[75vh] flex flex-col"
          >
            <h2 className="font-bold text-lg mb-3">{label}</h2>

            <div className="overflow-y-auto flex-1">
              {options.map((o: string) => (
                <div
                  key={o}
                  onClick={() => {
                    onSave(o)
                    setOpen(false)
                  }}
                  className="py-2 px-2 cursor-pointer hover:bg-gray-100 rounded"
                >
                  {o}
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                onClear()
                setOpen(false)
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

function Input({ label, value, type = 'text', onChange, readOnly }: any) {
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
