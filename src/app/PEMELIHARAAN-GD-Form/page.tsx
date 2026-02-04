'use client'

import { useMemo, useState, ChangeEvent } from 'react'
import Image from 'next/image'
import { IoArrowBack, IoChevronDown, IoClose } from 'react-icons/io5'
import { useRouter } from 'next/navigation'

import bg from '@/app/assets/plnup3/bgnogradient.png'
import plnKecil from '@/app/assets/plnup3/plnkecil.svg'

/* ================= TYPES ================= */

type SheetRow = {
  up3: string
  ulp: string
}

/* ================= PAGE ================= */

export default function Page() {
  const router = useRouter()

  const sheetData: SheetRow[] = [
    { up3: 'UP3 MAKASSAR SELATAN', ulp: 'PANAKKUKANG' },
  ]

  const ULP_LIST = useMemo(
    () => Array.from(new Set(sheetData.map(d => d.ulp))),
    [sheetData]
  )

  const [form, setForm] = useState({
    up3: 'UP3 MAKASSAR SELATAN',
    ulp: '',
    tanggalHar: '',
    longlat: '',
    jumlahCell: '0',
    pemeliharaan: '',
    komponen: '',
    keterangan: '',
    alasan: '',
  })

  const handleChange = (key: keyof typeof form, val: string) => {
    setForm(p => ({ ...p, [key]: val }))
  }

  /* ================= FOTO ================= */

  const [fotoSebelum, setFotoSebelum] = useState<File | null>(null)
  const [fotoProses, setFotoProses] = useState<File | null>(null)
  const [fotoSesudah, setFotoSesudah] = useState<File | null>(null)
  const [fotoLampiranBA, setFotoLampiranBA] = useState<File | null>(null)

  /* ================= VALIDASI ================= */

  const isFormValid =
    Object.values(form).every(v => v.trim() !== '') &&
    fotoSebelum &&
    fotoProses &&
    fotoSesudah &&
    fotoLampiranBA

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
          <h1 className="font-medium">Pemeliharaan GD Form</h1>
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

          <div className="flex-1 overflow-y-auto">

            {/* FORM */}
            <div className="grid w-full grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">

              {/* KOLOM KIRI */}
              <div className="flex flex-col gap-6">
                <Input label="UP3" value={form.up3} readOnly />

                <PopupSelect
                  label="Pemeliharaan Yang Dilakukan"
                  value={form.pemeliharaan}
                  options={[
                    'Pemeliharaan Preventif',
                    'Pemeliharaan Korektif',
                    'Inspeksi Rutin',
                  ]}
                  onSave={v => handleChange('pemeliharaan', v)}
                  onClear={() => handleChange('pemeliharaan', '')}
                />

                <PopupSelect
                  label="ULP"
                  value={form.ulp}
                  options={ULP_LIST}
                  onSave={v => handleChange('ulp', v)}
                  onClear={() => handleChange('ulp', '')}
                />

                <PopupSelect
                  label="Komponen"
                  value={form.komponen}
                  options={['Trafo', 'Panel', 'Cubicle', 'Relay']}
                  onSave={v => handleChange('komponen', v)}
                  onClear={() => handleChange('komponen', '')}
                />

                <Input
                  label="Tanggal HAR Gardu"
                  type="date"
                  value={form.tanggalHar}
                  onChange={e => handleChange('tanggalHar', e.target.value)}
                />
              </div>

              {/* KOLOM KANAN */}
              <div className="flex flex-col gap-6">

                <Input
                  label="Keterangan"
                  value={form.keterangan}
                  onChange={e => handleChange('keterangan', e.target.value)}
                />

                <PopupSelect
                  label="LONG / LAT"
                  value={form.longlat}
                  options={[
                    '-5.147665, 119.432732',
                    '-5.148210, 119.433120',
                  ]}
                  onSave={v => handleChange('longlat', v)}
                  onClear={() => handleChange('longlat', '')}
                />

                <PopupSelect
                  label="Alasan Gardu Dipelihara"
                  value={form.alasan}
                  options={['Gangguan', 'Usia Peralatan', 'Hasil Inspeksi']}
                  onSave={v => handleChange('alasan', v)}
                  onClear={() => handleChange('alasan', '')}
                />

                <NumberStepper
                  label="Jumlah Cell"
                  value={form.jumlahCell}
                  onChange={v => handleChange('jumlahCell', v)}
                />
              </div>
            </div>

            {/* FOTO */}
            <div className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-8">
              <UploadPreview label="Foto Sebelum" file={fotoSebelum} setFile={setFotoSebelum} />
              <UploadPreview label="Foto Proses Pengerjaan" file={fotoProses} setFile={setFotoProses} />
              <UploadPreview label="Foto Sesudah" file={fotoSesudah} setFile={setFotoSesudah} />
              <UploadPreview label="Lampiran BA Penggantian" file={fotoLampiranBA} setFile={setFotoLampiranBA} />
            </div>

            {/* ACTION */}
            <div className="flex gap-4 mt-12 justify-center">
              <button className="px-12 py-3 bg-red-500 text-white rounded-full">
                Cancel
              </button>
              <button
                disabled={!isFormValid}
                className={`px-12 py-3 rounded-full text-white ${isFormValid ? 'bg-[#2FA6DE]' : 'bg-gray-400 cursor-not-allowed'
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

type NumberStepperProps = {
  label: string
  value: string
  onChange: (value: string) => void
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
          readOnly
          value={num}
          className="flex-1 py-3 px-5 border-2 border-[#2FA6DE] rounded-full bg-white"
        />

        <button
          type="button"
          onClick={() => onChange(String(Math.max(0, num - 1)))}
          className="w-12 h-12 border rounded-full text-xl"
        >
          −
        </button>

        <button
          type="button"
          onClick={() => onChange(String(num + 1))}
          className="w-12 h-12 border rounded-full text-xl"
        >
          +
        </button>
      </div>
    </div>
  )
}

type UploadPreviewProps = {
  label: string
  file: File | null
  setFile: (file: File | null) => void
}

function UploadPreview({ label, file, setFile }: UploadPreviewProps) {
  const [open, setOpen] = useState(false)
  const preview = file ? URL.createObjectURL(file) : null

  return (
    <>
      <div>
        <label className="text-sm font-semibold">
          {label} <span className="text-red-500">*</span>
        </label>

        <div className="relative mt-2 h-[220px] border-2 border-dashed border-[#2FA6DE] rounded-2xl flex items-center justify-center">
          {preview ? (
            <>
              <img
                src={preview}
                alt="preview"
                onClick={() => setOpen(true)}
                className="max-h-full max-w-full object-contain cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setFile(null)}
                className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center"
              >
                <IoClose size={18} />
              </button>
            </>
          ) : (
            <label className="cursor-pointer text-gray-400">
              Klik untuk upload foto
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  e.target.files && setFile(e.target.files[0])
                }
              />
            </label>
          )}
        </div>
      </div>

      {open && preview && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
        >
          <img
            src={preview}
            alt="preview-large"
            className="max-w-[90vw] max-h-[90vh] rounded-xl"
          />
        </div>
      )}
    </>
  )
}

type PopupSelectProps = {
  label: string
  value: string
  options: string[]
  onSave: (value: string) => void
  onClear: () => void
}

function PopupSelect({ label, value, options, onSave, onClear }: PopupSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = options.filter(o =>
    o.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        <label className="text-sm font-semibold">
          {label} <span className="text-red-500">*</span>
        </label>
        <div className={`mt-2 px-5 py-3 rounded-full flex items-center justify-between border-2 transition
        ${value
              ? 'border-[#2FA6DE] bg-[#2FA6DE]/5'
              : 'border-[#2FA6DE]'
            } hover:bg-[#2FA6DE]/5`}>
          <span className={value ? '' : 'text-gray-400'}>
            {value || `Pilih ${label}`}
          </span>
          <IoChevronDown />
        </div>
      </div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white p-6 rounded-xl w-[700px] max-h-[75vh] flex flex-col"
          >
            <h2 className="font-bold mb-3">{label}</h2>

            <input
              placeholder="Cari..."
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
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
                    className={`py-2 px-3 rounded-lg cursor-pointer
                      ${selected
                        ? 'bg-[#E8F5FB]  text-blue-600 font-semibold'
                        : 'hover:bg-gray-100'}`}>
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

type InputProps = {
  label: string
  value: string
  type?: string
  readOnly?: boolean
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
}

function Input({ label, value, type = 'text', onChange, readOnly = false }: InputProps) {
  const isDateEmpty = type === 'date' && !value

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
          ${isDateEmpty ? 'text-gray-400' : 'text-black'}
        `}
      />
    </div>
  )
}