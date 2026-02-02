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
    tanggalPemeliharaan: '',
    panjangKms: '',
    NilaiTahananIsolasiSesudah: '0',
    pemeliharaan: '',
    alasan: '',
  })

  const handleChange = (key: keyof typeof form, val: string) => {
    setForm(p => ({ ...p, [key]: val }))
  }

  /* ================= FOTO ================= */

  const [fotoSebelum1, setFotoSebelum1] = useState<File | null>(null)
  const [fotoSebelum2, setFotoSebelum2] = useState<File | null>(null)
  const [fotoProses, setFotoProses] = useState<File | null>(null)
  const [fotoSesudah1, setFotoSesudah1] = useState<File | null>(null)
  const [fotoSesudah2, setFotoSesudah2] = useState<File | null>(null)

  /* ================= VALIDASI ================= */

  const isFormValid =
    Object.values(form).every(v => v.trim() !== '') &&
    fotoSebelum1 &&
    fotoSebelum2 &&
    fotoProses &&
    fotoSesudah1 &&
    fotoSesudah2

  return (
    <div className="h-screen flex flex-col font-poppins overflow-hidden">

      {/* BACKGROUND */}
      <div className="fixed inset-0 -z-10">
        <Image src={bg} alt="bg" fill className="object-cover" priority />
      </div>
      <div className="fixed inset-0 -z-10 bg-gradient-to-t from-[#165F67]/70 via-[#67C2E9]/30 to-transparent backdrop-blur-sm" />

      {/* HEADER */}
      <div className="px-4 pt-3 shrink-0">
        <div className="bg-white rounded-full shadow-lg px-6 py-1 flex items-center gap-3">
          <button
            onClick={() => router.push('/menu')}
            className="w-11 h-11 rounded-full hover:bg-gray-200 flex items-center justify-center"
          >
            <IoArrowBack size={24} />
          </button>
          <Image src={plnKecil} alt="pln" width={36} height={36} />
          <h1 className="font-medium">Pemeliharaan JTM Form</h1>
        </div>
      </div>

      {/* CONTENT */}
      <main className="flex-1 flex justify-center items-start px-0 pt-4 md:p-4 overflow-hidden">
        <div className="bg-white shadow-xl w-full flex flex-col h-full overflow-hidden rounded-t-[28px] md:rounded-3xl px-5 py-6 md:p-10 md:max-w-[1200px]">

          <div className="flex-1 overflow-y-auto">

            {/* FORM */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">

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

              <Input
                label="Tanggal Pemeliharaan"
                type="date"
                value={form.tanggalPemeliharaan}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleChange('tanggalPemeliharaan', e.target.value)
                }
              />

              <PopupSelect
                label="Panjang Km/s "
                value={form.panjangKms}
                options={[
                  '0.25 Km',
                  '0.5 Km',
                  '1 Km',
                  '1.5 Km',
                  '2 Km',
                ]}
                onSave={v => handleChange('panjangKms', v)}
                onClear={() => handleChange('panjangKms', '')}
              />

              <PopupSelect
                label="Alasan JTM Dipelihara"
                value={form.alasan}
                options={['Gangguan', 'Usia Peralatan', 'Hasil Inspeksi']}
                onSave={v => handleChange('alasan', v)}
                onClear={() => handleChange('alasan', '')}
              />

            </div>

            {/* FOTO */}
            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            <UploadPreview label="Foto Sebelum (1)" file={fotoSebelum1} setFile={setFotoSebelum1} />
            <UploadPreview label="Foto Sebelum (2)" file={fotoSebelum2} setFile={setFotoSebelum2} />
            <UploadPreview label="Foto Proses Pengerjaan" file={fotoProses} setFile={setFotoProses} />

            <div className="md:col-span-3 flex justify-center gap-8">
              <div className="w-full md:w-[320px]">
                <UploadPreview label="Foto Sesudah (1)" file={fotoSesudah1} setFile={setFotoSesudah1} />
              </div>
              <div className="w-full md:w-[320px]">
                <UploadPreview label="Foto Sesudah (2)" file={fotoSesudah2} setFile={setFotoSesudah2} />
              </div>
            </div>
            </div>

            <br/>
            <NumberStepper
                label="Nilai Tahanan Isolasi Sesudah"
                value={form.NilaiTahananIsolasiSesudah}
                onChange={v => handleChange('NilaiTahananIsolasiSesudah', v)}
              />


            {/* ACTION */}
            <div className="flex gap-4 mt-12 justify-center">
              <button className="px-12 py-3 bg-red-500 text-white rounded-full">
                Cancel
              </button>
              <button
                disabled={!isFormValid}
                className={`px-12 py-3 rounded-full text-white ${
                  isFormValid ? 'bg-[#2FA6DE]' : 'bg-gray-400 cursor-not-allowed'
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
        <div className="mt-2 px-5 py-3 border-2 border-[#2FA6DE] rounded-full flex justify-between">
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
              {filtered.map(o => (
                <div
                  key={o}
                  onClick={() => {
                    onSave(o)
                    setOpen(false)
                    setSearch('')
                  }}
                  className="py-2 px-3 hover:bg-gray-100 cursor-pointer rounded-lg"
                >
                  {o}
                </div>
              ))}
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