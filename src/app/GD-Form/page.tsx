'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { IoArrowBack, IoChevronDown } from 'react-icons/io5'
import bg from '@/app/assets/plnup3/bgnogradient.png'
import plnKecil from '@/app/assets/plnup3/plnkecil.svg'
import { useRouter } from 'next/navigation';


const API_URL = 'https://script.google.com/macros/s/AKfycbyPt-IwJu-2yloVyWPBf4Jm4i8O_5zGhsC2fQauuYUXupMGfmlWi3gBHZKHFzQFnQaT/exec'

type AsetGD = {
  up3: string
  ulp: string
  namaGardu: string
  penyulang: string
  zona: string
  section: string
  longlat: string
  kapasitas: number
  fasa: number
}


export default function Page() {

  // useEffect(() => {
  //   document.body.style.overflow = 'hidden'
  //   document.documentElement.style.overflow = 'hidden'

  //   return () => {
  //     document.body.style.overflow = ''
  //     document.documentElement.style.overflow = ''
  //   }
  // }, [])

  // ===== SISANYA KODE KAMU =====


  const router = useRouter();
  const [data, setData] = useState<AsetGD[]>([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<'open' | 'close' | null>(null)

  type ProgressKey = 'open' | 'close'

  const progressOptions: {
    key: ProgressKey
    label: string
    color: 'green' | 'red'
  }[] = [
      { key: 'open', label: 'Open Inspeksi', color: 'green' },
      { key: 'close', label: 'Close Inspeksi', color: 'red' },
    ]


  const [form, setForm] = useState({
    up3: 'UP3 MAKASSAR SELATAN',
    ulp: '',
    namaGardu: '',
    scheduleDate: '',
    penyulang: '',
    zona: '',
    section: '',
    longlat: '',
    kapasitas: '0',
    fasa: '0',
  })

  // ================= FETCH =================
  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(res => {
        setData(res)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // ✅ UP3 AUTO TERISI SEJAK AWAL
  useEffect(() => {
    if (data.length > 0) {
      setForm(p => ({
        ...p,
        up3: data[0].up3 || '',
      }))
    }
  }, [data])

  // ================= MASTER DATA =================
  const ULP_LIST = useMemo(() => [...new Set(data.map(d => d.ulp).filter(Boolean))], [data])
  const GARDU_LIST = useMemo(() => [...new Set(data.map(d => d.namaGardu).filter(Boolean))], [data])

  const PENYULANG_BY_ULP = useMemo(() => {
    const map: Record<string, string[]> = {}
    data.forEach(d => {
      if (!map[d.ulp]) map[d.ulp] = []
      if (!map[d.ulp].includes(d.penyulang)) map[d.ulp].push(d.penyulang)
    })
    return map
  }, [data])

  const ZONA_BY_PENYULANG = useMemo(() => {
    const map: Record<string, string[]> = {}
    data.forEach(d => {
      if (!map[d.penyulang]) map[d.penyulang] = []
      if (!map[d.penyulang].includes(d.zona)) map[d.penyulang].push(d.zona)
    })
    return map
  }, [data])

  const SECTION_BY_ZONA = useMemo(() => {
    const map: Record<string, string[]> = {}
    data.forEach(d => {
      if (!map[d.zona]) map[d.zona] = []
      if (!map[d.zona].includes(d.section)) map[d.zona].push(d.section)
    })
    return map
  }, [data])

  const handleGardu = (nama: string) => {
    const g = data.find(d => d.namaGardu === nama)

    if (!g) {
      setForm(p => ({
        ...p,
        namaGardu: nama,
      }))
      return
    }

    setForm(p => ({
      ...p,
      namaGardu: g.namaGardu,
      up3: g.up3,
      ulp: g.ulp,
      penyulang: g.penyulang,
      zona: g.zona,
      section: g.section,
      longlat: g.longlat,
      kapasitas: g.kapasitas.toString(),
      fasa: g.fasa.toString(),
    }))
  }

  const isValid =
    form.ulp &&
    form.namaGardu &&
    form.penyulang &&
    form.zona &&
    form.section &&
    form.scheduleDate &&
    progress !== null

  const handleSubmit = async () => {
    const payload = { ...form, progress }
    await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    alert('Data berhasil dikirim!')
  }

  return (
    <div className="h-screen overflow-hidden font-poppins flex flex-col">

      {/* BACKGROUND */}
      <div className="fixed inset-0 -z-10">
        <Image src={bg} alt="bg" fill className="object-cover" />
      </div>
      <div className="fixed inset-0 -z-10 bg-gradient-to-t from-[#165F67]/70 via-[#67C2E9]/30 to-transparent backdrop-blur-sm" />

      {/* HEADER */}
      <div className="px-4 pt-3 shrink-0">
        <div className="bg-white rounded-full shadow-lg px-6 py-1 flex items-center gap-3">
          <button onClick={() => router.push('/menu')} className="w-11 h-11 rounded-full hover:bg-gray-200 flex items-center justify-center">
            <IoArrowBack size={24} />
          </button>
          <Image src={plnKecil} alt="pln" width={36} height={36} />
          <h1 className="font-medium">Schedule GD Form</h1>
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
              md:max-w-[1200px]">

          {/* WRAPPER CENTER DESKTOP */}
          <div className="flex-1 overflow-y-auto">

            {/* ===== LOADING CONDITIONAL ===== */}
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500 text-lg font-medium">
                  Loading...
                </p>
              </div>
            ) : (
              <div className="min-h-full md:flex md:items-center">

                {/* ===== GRID FORM UTAMA ===== */}
                <div className="grid w-full grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">

                  {/* ================= KIRI ================= */}
                  <div className="flex flex-col gap-6">
                    <Input label="UP3" value={form.up3} readOnly />
                    <PopupSelect
                      label="ULP"
                      value={form.ulp}
                      options={ULP_LIST}
                      onSave={v => {
                        const ref = data.find(d => d.ulp === v)
                        setForm(p => ({
                          ...p,
                          ulp: v,
                          up3: ref?.up3 || form.up3,
                          penyulang: '',
                          zona: '',
                          section: '',
                        }))
                      }}
                      onClear={() => setForm(p => ({ ...p, ulp: '' }))}
                    />
                    <SearchableAddSelect
                      label="Nama Gardu"
                      value={form.namaGardu}
                      options={GARDU_LIST}
                      onSave={handleGardu}
                    />
                    <PopupSelect
                      label="Penyulang"
                      value={form.penyulang}
                      options={PENYULANG_BY_ULP[form.ulp] || []}
                      disabled={!form.ulp}
                      onSave={v => setForm(p => ({ ...p, penyulang: v, zona: '', section: '' }))}
                      onClear={() => setForm(p => ({ ...p, penyulang: '' }))}
                    />
                    <PopupSelect
                      label="Zona Proteksi"
                      value={form.zona}
                      options={ZONA_BY_PENYULANG[form.penyulang] || []}
                      disabled={!form.penyulang}
                      onSave={v => setForm(p => ({ ...p, zona: v, section: '' }))}
                      onClear={() => setForm(p => ({ ...p, zona: '' }))}
                    />
                    <PopupSelect
                      label="Section"
                      value={form.section}
                      options={SECTION_BY_ZONA[form.zona] || []}
                      disabled={!form.zona}
                      onSave={v => setForm(p => ({ ...p, section: v }))}
                      onClear={() => setForm(p => ({ ...p, section: '' }))}
                    />
                  </div>

                  {/* ================= KANAN ================= */}
                  <div className="flex flex-col gap-6">
                    <Input label="Longlat" value={form.longlat} readOnly placeholder="Belum terisi" />
                    <Input label="Kapasitas" value={form.kapasitas} readOnly placeholder="Belum terisi" />
                    <Input label="Fasa" value={form.fasa} readOnly placeholder="Belum terisi" />

                    <Input
                      label="Schedule Date"
                      type="date"
                      value={form.scheduleDate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setForm(p => ({ ...p, scheduleDate: e.target.value }))
                      }
                      className={form.scheduleDate ? "text-black" : "text-gray-400"}
                    />

                    {/* PROGRESS */}
                    <div>
                      <label className="text-sm font-semibold">
                        Progress <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-6 mt-3">
                        {progressOptions.map(item => (
                          <div
                            key={item.key}
                            onClick={() => setProgress(item.key)}
                            className="flex items-center gap-3 cursor-pointer"
                          >
                            <div
                              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${progress === item.key
                                ? item.color === "green"
                                  ? "bg-green-500 border-green-500"
                                  : "bg-red-500 border-red-500"
                                : "border-gray-400"
                                }`}
                            >
                              {progress === item.key && <span className="text-white text-lg">✓</span>}
                            </div>
                            <span className="font-medium">{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ACTION */}
                    <div className="flex gap-4 mt-8 items-end">
                      <button className="flex-1 py-3 bg-red-500 text-white rounded-full">
                        Cancel
                      </button>
                      <button
                        disabled={!isValid}
                        className={`flex-1 py-3 rounded-full text-white ${isValid ? "bg-[#2FA6DE]" : "bg-gray-400 cursor-not-allowed"
                          }`}
                      >
                        Submit
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}
            {/* ======== END LOADING CONDITIONAL ======== */}
          </div>
        </div>
      </main>
    </div>
  )
}

/* ================= COMPONENT ================= */

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
      {/* FIELD */}
      <div
        onClick={() => !disabled && setOpen(true)}
        className={`${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
        <label className="text-sm font-semibold">
          {label} <span className="text-red-500">*</span>
        </label>
        <div className="mt-2 px-5 py-3 border-2 border-[#2FA6DE] rounded-full flex justify-between items-center">
          <span className={value ? '' : 'text-gray-400'}>
            {value || `Pilih ${label}`}
          </span>
          <IoChevronDown />
        </div>
      </div>

      {/* POPUP */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"
          onClick={() => setOpen(false)}>
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white p-6 rounded-xl w-[600px] max-h-[75vh] flex flex-col">
            {/* HEADER */}
            <h2 className="text-lg font-semibold mb-3 border-b pb-2">
              {label}
            </h2>

            {/* LIST */}
            <div className="overflow-y-auto flex-1 mb-4">
              {options.map((o: string) => (
                <div
                  key={o}
                  onClick={() => { onSave(o); setOpen(false) }}
                  className={`py-2 px-2 hover:bg-gray-100 cursor-pointer rounded transition
        ${o === value ? 'font-bold text-blue-600' : ''}`} // <-- bold + warna biru kalau dipilih
                >
                  {o}
                </div>
              ))}
            </div>


            {/* 🔴 CLEAR TENGAH BAWAH (SELALU TERLIHAT) */}
            <div className="pt-3 border-t flex justify-center">
              <button
                onClick={() => {
                  onClear()
                  setOpen(false)
                }}
                className="text-red-500 hover:underline"
              >
                Clear
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}


function SearchableAddSelect({ label, value, options, onSave }: any) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = options.filter((o: string) =>
    o.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      {/* FIELD */}
      <div
        onClick={() => setOpen(true)}
        className="cursor-pointer"
      >
        <label className="text-sm font-semibold">
          {label} <span className="text-red-500">*</span>
        </label>
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
                    ${o === value ? 'font-bold text-blue-600' : 'hover:bg-gray-100'}`} // ✅ highlight pilihan
                >
                  {o}
                </div>
              ))}
            </div>

            {filtered.length === 0 && search.trim() && (
              <div className="border-t pt-3 text-center">
                <button
                  onClick={() => { onSave(search.trim()); setOpen(false); setSearch('') }}
                  className="px-4 py-2 bg-[#2FA6DE] text-white rounded-lg"
                >
                  Tambah "{search}"
                </button>
              </div>
            )}

            <button
              onClick={() => { setOpen(false); setSearch('') }}
              className="text-red-500 mt-3"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function Input({ label, value, type = 'text', onChange, readOnly = false, placeholder }: any) {
  return (
    <div>
      <label className="text-sm font-semibold">
        {label} <span className="text-red-500">*</span>
      </label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder || `Masukkan ${label}`}
        onChange={onChange}
        className={`mt-2 w-full py-3 px-5 border-2 border-[#2FA6DE] rounded-full 
          placeholder:text-gray-400
          ${!value ? 'text-gray-400' : 'text-black'}
          ${readOnly ? 'bg-gray-100' : ''}
        `}
      />
    </div>
  )
}

