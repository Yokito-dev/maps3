'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState, ChangeEvent, useEffect } from 'react'
import Image from 'next/image'
import { IoArrowBack, IoChevronDown, IoClose, IoLocationSharp, IoCamera } from 'react-icons/io5'
import { useRouter } from 'next/navigation'

import bg from '@/app/assets/plnup3/bgnogradient.png'
import plnKecil from '@/app/assets/plnup3/plnkecil.svg'

const MapPicker = dynamic(() => import('../components/MapPicker'), { ssr: false })

/* ================= MOCK DATA ================= */

type AsetRow = {
  up3: string
  ulp: string
  penyulang: string
  zona: string
  section: string
}

const ASET_DATA: AsetRow[] = [
  {
    up3: 'UP3 MAKASSAR SELATAN',
    ulp: 'KALEBAJENG',
    penyulang: 'MALEWANG',
    zona: 'P_MALEWANG',
    section: 'EXIM KALASERENA - REC KALASERENA',
  },
  {
    up3: 'UP3 MAKASSAR SELATAN',
    ulp: 'PANAKKUKANG',
    penyulang: 'PANAKKUKANG_1',
    zona: 'P_PANAKKUKANG_1',
    section: 'SECTION A',
  },
]

/* ================= OPTIONS ================= */

const SIAPA_MENGISI_LIST = ['TIM INSPEKSI', 'VENDOR', 'PEGAWAI', 'LAINNYA']

// ✅ jadi 5 tombol 1 grup (4 + "UNTUK INSPEKSI DRONE")
const INSPEKSI_DENGAN_LIST = ['TANPA ALAT', 'TEROPONG', 'THERMOVISION', 'ULTRASONIC', 'UNTUK INSPEKSI DRONE']

const TEMUAN_LIST = ['KONDUKTOR', 'ISOLATOR', 'ARRESTER', 'TIANG', 'KONSTRUKSI', 'LAINNYA']
const SPESIFIK_TEMUAN_LIST = [
  '(1.1) KAWAT TERBURAI',
  '(1.2) KAWAT KENDOR',
  '(2.1) ISOLATOR RETAK',
  '(2.2) ISOLATOR PECAH',
]

const EKSEKUSI_LIST = ['EKSEKUSI', 'BELUM', 'DIJADWALKAN']
const DIEKSEKUSI_OLEH_LIST = ['TIM PDKB', 'TIM HAR UP3', 'TIM YANTEK', 'PEGAWAI', 'VENDOR']
const APA_YANG_DILAKUKAN_LIST = [
  'PERBAIKAN KAWAT TERBURAI',
  'PENGGANTIAN ISOLATOR',
  'PENEBANGAN POHON',
  'PENGENCANGAN ANDONGAN',
]

/* ================= HELPERS ================= */

const formatKoordinat = (v: string, decimals = 6) => {
  const parts = String(v || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  if (parts.length < 2) return v
  const lat = Number(parts[0])
  const lng = Number(parts[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return v
  return `${lat.toFixed(decimals)}, ${lng.toFixed(decimals)}`
}

/* ================= PAGE ================= */

export default function Page() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [showMap, setShowMap] = useState(false)

  const [evidenceTemuan, setEvidenceTemuan] = useState<File | null>(null)
  const [evidenceEksekusi, setEvidenceEksekusi] = useState<File | null>(null)

  const [form, setForm] = useState({
    // SLIDE 1
    up3: 'UP3 MAKASSAR SELATAN',
    ulp: '',
    penyulang: '',
    zonaProteksi: '',
    section: '',

    siapaMengisi: '',
    noReferensi: '',
    namaInspektor: '',
    tanggalInspeksi: '',
    inspeksiDengan: '', // ✅ 1 grup 5 tombol

    // SLIDE 2
    temuan: '',
    spesifikTemuan: '',
    jumlahTemuan: 1,
    koordinat: '',
    keteranganTemuan: '',
    statusPotensi: 'POTENSI GANGGUAN JANGKA PENDEK',
    eksekusi: '',
    dieksekusiOleh: '',
    apaYangDilakukan: '',
    tanggalEksekusi: '',
    diameterPohon: '',
    warning: '',
  })

  const handleChange = (key: keyof typeof form, val: any) => {
    setForm(p => ({ ...p, [key]: val }))
  }

  /* ===== dropdown chain lokasi ===== */

  const ULP_LIST = useMemo(() => {
    return Array.from(new Set(ASET_DATA.filter(d => d.up3 === form.up3).map(d => d.ulp).filter(Boolean)))
  }, [form.up3])

  const PENYULANG_LIST = useMemo(() => {
    if (!form.ulp) return []
    return Array.from(new Set(ASET_DATA.filter(d => d.ulp === form.ulp).map(d => d.penyulang).filter(Boolean)))
  }, [form.ulp])

  const ZONA_LIST = useMemo(() => {
    if (!form.penyulang) return []
    return Array.from(new Set(ASET_DATA.filter(d => d.penyulang === form.penyulang).map(d => d.zona).filter(Boolean)))
  }, [form.penyulang])

  const SECTION_LIST = useMemo(() => {
    if (!form.zonaProteksi) return []
    return Array.from(new Set(ASET_DATA.filter(d => d.zona === form.zonaProteksi).map(d => d.section).filter(Boolean)))
  }, [form.zonaProteksi])

  // reset cascade
  useEffect(() => {
    setForm(p => ({ ...p, penyulang: '', zonaProteksi: '', section: '' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.ulp])

  useEffect(() => {
    setForm(p => ({ ...p, zonaProteksi: '', section: '' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.penyulang])

  useEffect(() => {
    setForm(p => ({ ...p, section: '' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.zonaProteksi])

  const handleCancel = () => {
    setForm(p => ({
      ...p,
      ulp: '',
      penyulang: '',
      zonaProteksi: '',
      section: '',
      siapaMengisi: '',
      noReferensi: '',
      namaInspektor: '',
      tanggalInspeksi: '',
      inspeksiDengan: '',
      temuan: '',
      spesifikTemuan: '',
      jumlahTemuan: 1,
      koordinat: '',
      keteranganTemuan: '',
      eksekusi: '',
      dieksekusiOleh: '',
      apaYangDilakukan: '',
      tanggalEksekusi: '',
      diameterPohon: '',
      warning: '',
    }))
    setEvidenceTemuan(null)
    setEvidenceEksekusi(null)
    setShowMap(false)
    setStep(1)
  }

  const handleSave = () => {
    console.log('SAVE', { ...form, evidenceTemuan, evidenceEksekusi })
    alert('Saved (dummy).')
  }

  return (
    <div className="h-screen flex flex-col font-poppins overflow-hidden">
      {/* BACKGROUND */}
      <div className="fixed inset-0 -z-10">
        <Image src={bg} alt="bg" fill className="object-cover" priority />
      </div>
      <div className="fixed inset-0 -z-10 bg-gradient-to-t from-[#165F67]/70 via-[#67C2E9]/30 to-transparent backdrop-blur-sm" />

      {/* HEADER */}
      <div className="px-4 pt-3">
        <div className="bg-white rounded-full shadow px-6 py-2 flex items-center gap-3">
          <button onClick={() => router.push('/menu')}>
            <IoArrowBack size={22} />
          </button>
          <Image src={plnKecil} alt="pln" width={34} />
          <h1 className="font-medium">Form JTM Slicer</h1>
          <div className="ml-auto text-xs text-slate-500">Step {step}/2</div>
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
          <div className="flex-1 overflow-y-auto pr-1 md:pr-4">
            {/* ================= SLIDE 1 ================= */}
            {step === 1 && (
              <div className="flex flex-col md:flex-row gap-8 md:gap-10">
                {/* KIRI */}
                <div className="flex-1 flex flex-col gap-6">
                  <Input label="UP3" value={form.up3} readOnly />

                  <PopupSelect
                    label="ULP"
                    value={form.ulp}
                    options={ULP_LIST}
                    onSave={v => handleChange('ulp', v)}
                    onClear={() => handleChange('ulp', '')}
                  />

                  <PopupSelect
                    label="Penyulang"
                    value={form.penyulang}
                    options={PENYULANG_LIST}
                    disabled={!form.ulp}
                    onSave={v => handleChange('penyulang', v)}
                    onClear={() => handleChange('penyulang', '')}
                  />

                  <PopupSelect
                    label="Zona Proteksi"
                    value={form.zonaProteksi}
                    options={ZONA_LIST}
                    disabled={!form.penyulang}
                    onSave={v => handleChange('zonaProteksi', v)}
                    onClear={() => handleChange('zonaProteksi', '')}
                  />

                  <PopupSelect
                    label="Section"
                    value={form.section}
                    options={SECTION_LIST}
                    disabled={!form.zonaProteksi}
                    searchable
                    onSave={v => handleChange('section', v)}
                    onClear={() => handleChange('section', '')}
                  />
                </div>

                {/* KANAN */}
                <div className="flex-1 flex flex-col gap-6">
                  <PopupSelect
                    label="Siapa yang mengisi?"
                    value={form.siapaMengisi}
                    options={SIAPA_MENGISI_LIST}
                    searchable
                    onSave={v => handleChange('siapaMengisi', v)}
                    onClear={() => handleChange('siapaMengisi', '')}
                  />

                  <Input label="No Referensi" value={form.noReferensi} onChange={e => handleChange('noReferensi', e.target.value)} />

                  <Input label="Nama Inspektor" value={form.namaInspektor} onChange={e => handleChange('namaInspektor', e.target.value)} />

                  <Input
                    label="Tanggal Inspeksi"
                    type="date"
                    value={form.tanggalInspeksi}
                    onChange={e => handleChange('tanggalInspeksi', e.target.value)}
                  />

                  {/* ✅ 5 tombol 1 grup, rapi & seimbang */}
                  <SegmentedSelectFive
                    label="Inspeksi dilakukan dengan?"
                    value={form.inspeksiDengan}
                    options={INSPEKSI_DENGAN_LIST}
                    onChange={v => handleChange('inspeksiDengan', v)}
                  />
                </div>
              </div>
            )}

            {/* ================= SLIDE 2 ================= */}
            {step === 2 && (
              <div className="flex flex-col md:flex-row gap-8 md:gap-10">
                {/* KIRI */}
                <div className="flex-1 flex flex-col gap-6">
                  <PopupSelect
                    label="Temuan?"
                    value={form.temuan}
                    options={TEMUAN_LIST}
                    onSave={v => handleChange('temuan', v)}
                    onClear={() => handleChange('temuan', '')}
                  />

                  <PopupSelect
                    label="Spesifik Temuan"
                    value={form.spesifikTemuan}
                    options={SPESIFIK_TEMUAN_LIST}
                    searchable
                    onSave={v => handleChange('spesifikTemuan', v)}
                    onClear={() => handleChange('spesifikTemuan', '')}
                  />

                  <NumberStepper label="Jumlah Temuan" value={form.jumlahTemuan} onChange={v => handleChange('jumlahTemuan', v)} />

                  <KoordinatInput
                    label="Koordinat"
                    value={form.koordinat}
                    onChange={v => handleChange('koordinat', v)}
                    onPick={() => setShowMap(true)}
                    onBlur={() => handleChange('koordinat', formatKoordinat(form.koordinat, 6))}
                  />

                  {showMap && (
                    <div className="w-full">
                      <div className="mt-2 w-full rounded-xl border border-slate-300 bg-white" style={{ height: 360 }}>
                        <div className="w-full h-full">
                          <MapPicker
                            koordinat={form.koordinat}
                            onChange={(v: string) => {
                              handleChange('koordinat', formatKoordinat(v, 6))
                              setShowMap(false)
                            }}
                          />
                        </div>
                      </div>
                      <button type="button" onClick={() => setShowMap(false)} className="mt-3 px-5 py-2 border rounded-full">
                        Tutup Map
                      </button>
                    </div>
                  )}

                  <SingleImageUpload label="Evidence Temuan" file={evidenceTemuan} setFile={setEvidenceTemuan} />

                  <Input
                    label="Keterangan Temuan"
                    value={form.keteranganTemuan}
                    onChange={e => handleChange('keteranganTemuan', e.target.value)}
                  />

                  <Input label="Status Potensi" value={form.statusPotensi} readOnly />
                </div>

                {/* KANAN */}
                <div className="flex-1 flex flex-col gap-6">
                  <PopupSelect
                    label="Eksekusi?"
                    value={form.eksekusi}
                    options={EKSEKUSI_LIST}
                    onSave={v => handleChange('eksekusi', v)}
                    onClear={() => handleChange('eksekusi', '')}
                  />

                  <SingleImageUpload label="Evidence Eksekusi" file={evidenceEksekusi} setFile={setEvidenceEksekusi} />

                  <PopupSelect
                    label="Dieksekusi oleh?"
                    value={form.dieksekusiOleh}
                    options={DIEKSEKUSI_OLEH_LIST}
                    searchable
                    onSave={v => handleChange('dieksekusiOleh', v)}
                    onClear={() => handleChange('dieksekusiOleh', '')}
                  />

                  <PopupSelect
                    label="Apa yang dilakukan?"
                    value={form.apaYangDilakukan}
                    options={APA_YANG_DILAKUKAN_LIST}
                    searchable
                    onSave={v => handleChange('apaYangDilakukan', v)}
                    onClear={() => handleChange('apaYangDilakukan', '')}
                  />

                  <Input
                    label="Tanggal Eksekusi"
                    type="datetime-local"
                    value={form.tanggalEksekusi}
                    onChange={e => handleChange('tanggalEksekusi', e.target.value)}
                  />

                  <Input
                    label="Diisi Diameter Pohon bila dilakukan Penebangan"
                    value={form.diameterPohon}
                    onChange={e => handleChange('diameterPohon', e.target.value)}
                  />

                  <Input label="warning" value={form.warning} onChange={e => handleChange('warning', e.target.value)} />
                </div>
              </div>
            )}

            {/* ACTION (Next sengaja diaktifin dulu) */}
            <div className="flex items-center justify-between gap-4 mt-12">
              <button
                type="button"
                onClick={() => {
                  if (step === 1) router.push('/menu')
                  else setStep(1)
                }}
                className="px-10 py-3 border rounded-full"
              >
                {step === 1 ? 'Back' : 'Prev'}
              </button>

              <button type="button" onClick={handleCancel} className="px-12 py-3 bg-red-500 text-white rounded-full">
                Cancel
              </button>

              {step === 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(2)} // ✅ always enabled dulu
                  className="px-12 py-3 rounded-full text-white bg-[#2FA6DE]"
                >
                  Next
                </button>
              ) : (
                <button type="button" onClick={handleSave} className="px-12 py-3 rounded-full text-white bg-[#2FA6DE]">
                  Save
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

/* ================= COMPONENTS ================= */

type SegmentedSelectFiveProps = {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}
function SegmentedSelectFive({ label, value, options, onChange }: SegmentedSelectFiveProps) {
  // ✅ rapi: 2 kolom + 2 kolom + 1 full (di desktop jadi 3 kolom)
  return (
    <div>
      <label className="text-sm font-semibold">
        {label} <span className="text-red-500">*</span>
      </label>

      <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
        {options.map(opt => {
          const active = opt === value
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`px-4 py-3 rounded-xl border transition text-sm md:text-base ${
                active ? 'bg-[#2FA6DE] text-white border-[#2FA6DE]' : 'bg-white hover:bg-slate-50'
              }`}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

type NumberStepperProps = {
  label: string
  value: number
  onChange: (value: number) => void
}
function NumberStepper({ label, value, onChange }: NumberStepperProps) {
  const num = Number(value || 0)
  return (
    <div>
      <label className="text-sm font-semibold">
        {label} <span className="text-red-500">*</span>
      </label>

      <div className="flex items-center gap-3 mt-2">
        <input
          type="number"
          value={String(value)}
          onChange={e => onChange(Number(e.target.value || 0))}
          className="flex-1 py-3 px-5 border-2 border-[#2FA6DE] rounded-full bg-white"
        />

        <button type="button" onClick={() => onChange(Math.max(0, num - 1))} className="w-12 h-12 border rounded-full text-xl">
          −
        </button>

        <button type="button" onClick={() => onChange(num + 1)} className="w-12 h-12 border rounded-full text-xl">
          +
        </button>
      </div>
    </div>
  )
}

type KoordinatInputProps = {
  label: string
  value: string
  onChange: (v: string) => void
  onPick: () => void
  onBlur?: () => void
}
function KoordinatInput({ label, value, onChange, onPick, onBlur }: KoordinatInputProps) {
  return (
    <div>
      <label className="text-sm font-semibold">
        {label} <span className="text-red-500">*</span>
      </label>

      <div className="mt-2 relative">
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          className="w-full py-3 pl-5 pr-12 border-2 border-[#2FA6DE] rounded-full"
          placeholder="Klik ikon map untuk memilih lokasi"
        />
        <button type="button" onClick={onPick} className="absolute right-4 top-1/2 -translate-y-1/2 text-dark" title="Pilih lokasi">
          <IoLocationSharp size={20} />
        </button>
      </div>
    </div>
  )
}

type SingleImageUploadProps = {
  label: string
  file: File | null
  setFile: (f: File | null) => void
}
function SingleImageUpload({ label, file, setFile }: SingleImageUploadProps) {
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file])

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  return (
    <div>
      <label className="text-sm font-semibold">
        {label} <span className="text-red-500">*</span>
      </label>

      <div className="mt-2 border-2 border-dashed border-[#2FA6DE] rounded-2xl p-4">
        {!file ? (
          <label className="cursor-pointer flex items-center justify-center gap-2 text-slate-500 py-10">
            <IoCamera size={18} />
            Upload / Kamera
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) setFile(f)
              }}
            />
          </label>
        ) : (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="preview" className="w-full max-h-[260px] object-contain rounded-xl" />
            <button
              type="button"
              onClick={() => setFile(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center"
            >
              <IoClose size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

type PopupSelectProps = {
  label: string
  value: string
  options: string[]
  onSave: (value: string) => void
  onClear: () => void
  disabled?: boolean
  searchable?: boolean
}
function PopupSelect({ label, value, options, onSave, onClear, disabled = false, searchable = false }: PopupSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!searchable) return options
    return options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
  }, [options, search, searchable])

  return (
    <>
      <div onClick={() => !disabled && setOpen(true)} className={`cursor-pointer ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <label className="text-sm font-semibold">
          {label} <span className="text-red-500">*</span>
        </label>
        <div className={`mt-2 px-5 py-3 rounded-full flex items-center justify-between border-2 transition
          ${value ? 'border-[#2FA6DE] bg-[#2FA6DE]/5' : 'border-[#2FA6DE]'}
          hover:bg-[#2FA6DE]/5`}>
          <span className={value ? '' : 'text-gray-400'}>{value || `Pilih ${label}`}</span>
          <IoChevronDown />
        </div>
      </div>

      {open && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div onClick={e => e.stopPropagation()} className="bg-white p-6 rounded-xl w-[700px] max-h-[75vh] flex flex-col">
            <h2 className="font-bold mb-3">{label}</h2>

            {searchable && (
              <input
                placeholder="Cari..."
                value={search}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
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
                    className={`py-2 px-3 rounded-lg cursor-pointer ${selected ? 'bg-[#E8F5FB] text-blue-600 font-semibold' : 'hover:bg-gray-100'}`}
                  >
                    {o}
                  </div>
                )
              })}
            </div>

            <button
              onClick={() => {
                onClear()
                setOpen(false)
                setSearch('')
              }}
              className="text-red-500 mt-3">
              Clear
            </button>
          </div>
        </div>
      )}
    </>
  )
}

type InputProps = {
  label: string
  value: string
  type?: string
  readOnly?: boolean
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
}
function Input({ label, value, type = 'text', onChange, readOnly = false }: InputProps) {
  const isDateEmpty = (type === 'date' || type === 'datetime-local') && !value
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
        className={`mt-2 w-full py-3 px-5 border-2 border-[#2FA6DE] rounded-full
          ${readOnly ? 'bg-gray-100' : ''}
          ${isDateEmpty ? 'text-gray-400' : 'text-black'}`}
      />
    </div>
  )
}