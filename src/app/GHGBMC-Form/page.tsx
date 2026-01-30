'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { IoArrowBack, IoChevronDown } from 'react-icons/io5'
import bg from '@/app/assets/plnup3/bgnogradient.png'
import plnKecil from '@/app/assets/plnup3/plnkecil.svg'
import { useRouter } from 'next/navigation'

const API_URL =
'https://script.google.com/macros/s/AKfycbwWaaqmQFyK6dZwaNIhbnUQJQ4QIEpgVsjgWEIaP3E_AumQ0e5O-Sk-s3qCg_JrjDKv9A/exec'
  // 'https://script.google.com/macros/s/AKfycbzp4aX1c5Kh9ME0Um742ENBJVkCYMkNtO-9XIfXG1tcCSZlBPfr1D5EaxVgGsNB-8rx/exec'
//'https://script.google.com/macros/s/AKfycbyeZGyvtK9fzLEMXpjJPVRiRGFC8_9G6TVl9P8oA4-fAQoZlSG6HY5EnHFvatbFgEuQDA/exec'

type Row = {
  up3: string
  ulp: string
  nama_gardu: string
}

export default function Page() {
  const router = useRouter()
  const [data, setData] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<'open' | 'close' | null>(null)

  const [form, setForm] = useState({
    up3: 'UP3 MAKASSAR SELATAN',
    ulp: '',
    namaGardu: '',
    scheduleDate: '',
    statusMilik: '',
  })

  const handleSubmit = async () => {
    const payload = {
      up3: form.up3,
      ulp: form.ulp,
      namaGardu: form.namaGardu,
      startDate: form.scheduleDate,
      endDate: form.scheduleDate,
      progress: progress === 'open' ? 'OPEN INSPEKSI' : 'CLOSE INSPEKSI',
      colour: progress === 'open' ? 'Green' : 'Red',
      statusMilik: form.statusMilik,
    }

    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      alert('Schedule berhasil disimpan')
      router.push('/menu')

    } catch (err) {
      console.error(err)
      alert('Koneksi ke Spreadsheet gagal')
    }
  }


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
      if (!d.ulp || !d.nama_gardu) return // ⬅️ TAMBAHAN PENTING

      if (!m[d.ulp]) m[d.ulp] = []

      if (!m[d.ulp].includes(d.nama_gardu)) {
        m[d.ulp].push(d.nama_gardu)
      }
    })

    return m
  }, [data])


  const isFormValid =
    form.ulp &&
    form.namaGardu &&
    form.scheduleDate &&
    form.statusMilik &&
    progress

  return (
    <div className="h-screen overflow-hidden font-poppins flex flex-col">

      {/* BACKGROUND */}
      <div className="fixed inset-0 -z-10">
        <Image src={bg} alt="Background" fill className="object-cover" priority />
      </div>
      <div className="fixed inset-0 -z-10 bg-gradient-to-t from-[#165F67]/70 via-[#67C2E9]/30 to-transparent backdrop-blur-sm" />

      {/* HEADER */}
      <div className="px-4 pt-3 shrink-0">
        <div className="bg-white rounded-full shadow-lg px-6 py-1 flex items-center gap-3">
          <button onClick={() => router.push('/menu')} className="w-11 h-11 rounded-full hover:bg-gray-200 flex items-center justify-center">
            <IoArrowBack size={24} />
          </button>
          <Image src={plnKecil} alt="pln" width={36} height={36} />
          <h1 className="font-medium">Schedule GH GB MC Form</h1>
        </div>
      </div>

      {/* MAIN */}
      <main className="flex-1 flex justify-center items-start px-0 pt-4 md:p-4 min-h-0">
        <div
          className="
          bg-white shadow-xl w-full
          h-full
          rounded-t-[28px] rounded-b-none
          px-5 py-6

          md:h-[82vh]
          md:rounded-3xl
          md:p-10
          md:max-w-[1200px]">

          {/* CONTAINER RELATIVE */}
          <div className="relative h-full">

            {/* ===== LOADING ===== */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-gray-500 text-lg font-medium">
                  Loading...
                </p>
              </div>
            )}

            {/* ===== FORM (BARU MUNCUL SETELAH LOADING FALSE) ===== */}
            {!loading && (
              <div className="h-full overflow-y-auto md:overflow-visible">

                {/* WRAPPER CENTER DESKTOP */}
                <div className="min-h-full md:flex md:items-center">

                  {/* GRID FORM */}
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
                      />
                    </div>

                    {/* ================= KANAN ================= */}
                    <div className="flex flex-col gap-6">

                      <Input
                        label="Schedule Date"
                        type="date"
                        value={form.scheduleDate}
                        onChange={e => change('scheduleDate', e.target.value)}
                      />

                      {/* PROGRESS */}
                      <div>
                        <label className="text-sm font-semibold">
                          Progress <span className="text-red-500">*</span>
                        </label>

                        <div className="flex gap-6 mt-3">
                          {[
                            { k: 'open', l: 'Open Inspeksi', c: 'green' },
                            { k: 'close', l: 'Close Inspeksi', c: 'red' },
                          ].map(i => (
                            <div
                              key={i.k}
                              onClick={() => setProgress(i.k as 'open' | 'close')}
                              className="flex items-center gap-3 cursor-pointer"
                            >
                              <div
                                className={`w-12 h-12 rounded-full border-2 flex items-center justify-center
                            ${progress === i.k
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

                      {/* ACTION */}
                      <div className="flex gap-4 mt-8 items-end">
                        <button
                          onClick={() => router.push('/schedule-gh-gb-mc')}
                          className="flex-1 py-3 bg-red-500 text-white rounded-full"
                        >
                          Cancel
                        </button>

                        <button
                          disabled={!isFormValid}
                          onClick={handleSubmit}
                          className={`flex-1 py-3 rounded-full text-white ${isFormValid
                            ? 'bg-[#2FA6DE]'
                            : 'bg-gray-400 cursor-not-allowed'
                            }`}
                        >
                          Submit
                        </button>

                      </div>

                    </div>
                  </div>
                </div>
              </div>
            )}

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
  className = '',
}: {
  label: string
  value: string
  type?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  readOnly?: boolean
  className?: string
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
        placeholder={`Masukkan ${label}`}
        className={`mt-2 w-full py-3 px-5 border-2 border-[#2FA6DE] rounded-full 
          placeholder:text-gray-400
          ${!value ? 'text-gray-400' : 'text-black'}
          ${readOnly ? 'bg-gray-100' : ''}
          ${className}
        `}
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
}

function PopupSelect({ label, value, options, onSave, onClear, disabled = false }: PopupSelectProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div
        onClick={() => !disabled && setOpen(true)}
        className={`${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
        <label className="text-sm font-semibold">{label} <span className="text-red-500">*</span></label>
        <div className="mt-2 px-5 py-3 border-2 border-[#2FA6DE] rounded-full flex justify-between items-center">
          <span className={value ? '' : 'text-gray-400'}>{value || `Pilih ${label}`}</span>
          <IoChevronDown />
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"
          onClick={() => setOpen(false)}>
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white p-6 rounded-xl w-[600px] max-h-[75vh] flex flex-col">
            <h2 className="text-lg font-semibold mb-3 border-b pb-2">{label}</h2>

            <div className="overflow-y-auto flex-1 mb-4">
              {options.map((o: string) => (
                <div
                  key={o}
                  onClick={() => { onSave(o); setOpen(false) }}
                  className={`py-2 px-2 cursor-pointer rounded transition
      ${o === value ? 'font-bold text-blue-600' : 'hover:bg-gray-100'}`} // <-- hover hanya untuk yg belum dipilih
                >
                  {o}
                </div>
              ))}

            </div>


            <div className="pt-3 border-t flex justify-center">
              <button
                onClick={() => { onClear(); setOpen(false) }}
                className="text-red-500 hover:underline">
                Clear
              </button>
            </div>
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

function SearchableAddSelect({ label, value, options, onSave, disabled = false }: SearchableAddSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = options.filter((o: string) => o.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      {/* FIELD */}
      <div
        onClick={() => !disabled && setOpen(true)}
        className={`${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
        <label className="text-sm font-semibold">{label} <span className="text-red-500">*</span></label>
        <div className="mt-2 px-5 py-3 border-2 border-[#2FA6DE] rounded-full flex justify-between items-center bg-white">
          <span className={value ? 'text-black' : 'text-gray-400'}>
            {value || `Pilih ${label}`}
          </span>
          <IoChevronDown />
        </div>
      </div>

      {/* POPUP */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white p-6 rounded-xl w-[600px] max-h-[75vh] flex flex-col"
          >
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">{label}</h2>

            <input
              placeholder={`Cari / tambah ${label}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="mb-3 px-4 py-2 border rounded-lg"
            />

            <div className="overflow-y-auto flex-1 mb-3">
              {filtered.map((o: string) => (
                <div
                  key={o}
                  onClick={() => { onSave(o); setOpen(false); setSearch('') }}
                  className={`py-2 px-2 cursor-pointer rounded transition-all duration-200
      ${value === o ? 'font-bold text-blue-600' : 'hover:bg-gray-100'}`}
                >
                  {o}
                </div>
              ))}

            </div>

            {filtered.length === 0 && search.trim() && (
              <div className="border-t pt-3 text-center">
                <button
                  onClick={() => { onSave(search.trim()); setOpen(false); setSearch('') }}
                  className="px-4 py-2 bg-[#2FA6DE] text-white rounded-lg">
                  Tambah "{search}"
                </button>
              </div>
            )}

            <button
              onClick={() => { setOpen(false); setSearch('') }}
              className="text-red-500 mt-3">
              Clear
            </button>
          </div>
        </div>
      )}
    </>
  )
}

