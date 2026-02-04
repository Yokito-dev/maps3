'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState, ChangeEvent, useEffect } from 'react'
import Image from 'next/image'
import { IoArrowBack, IoChevronDown, IoClose, IoLocationSharp } from 'react-icons/io5'
import { useRouter } from 'next/navigation'
const MapPicker = dynamic(() => import('./MapPicker'), { ssr: false })

import bg from '@/app/assets/plnup3/bgnogradient.png'
import plnKecil from '@/app/assets/plnup3/plnkecil.svg'

const API_URL =
  'https://script.google.com/macros/s/AKfycbyCxXZWyPBCJsyuLZpeynkr6V5FGCsLZopQaUQTPRIMKA6vpXriueq26O1n-SrsK_ALfA/exec'

/* ================= PAGE ================= */

export default function Page() {
  const router = useRouter()
  const [asetRows, setAsetRows] = useState<any[]>([])

  const sheetData = [
    { up3: 'UP3 MAKASSAR SELATAN', ulp: 'PANAKKUKANG' },
  ]

  const ULP_LIST = useMemo(() => {
    return Array.from(
      new Set(asetRows.map(r => r.ulp).filter(Boolean))
    )
  }, [asetRows])

  const [form, setForm] = useState({
    up3: 'UP3 MAKASSAR SELATAN',
    ulp: '',
    penyulang: '',
    zonaProteksi: '',
    section: '',
    panjangKms: '0',
    alasan: '',
    pemeliharaan: '',
    tanggalPemeliharaan: '',
    dieksekusiOleh: '',
    jumlahItemMaterial: '0',
    NilaiTahananIsolasiSesudah: '0',
    nilaiPertanahan: '0',
    keterangan: '',
    koordinat: '',
  })

  const handleChange = (key: keyof typeof form, val: string) => {
    setForm(p => ({ ...p, [key]: val }))
  }

  /* ================= FOTO ================= */

  const [fotoSebelum, setFotoSebelum] = useState<File[]>([])
  const [fotoProses, setFotoProses] = useState<File[]>([])
  const [fotoSesudah, setFotoSesudah] = useState<File[]>([])
  const [showMap, setShowMap] = useState(false);

  const penyulangList = useMemo(() => {
    if (!form.ulp) return []

    return Array.from(
      new Set(
        asetRows
          .filter(r => r.ulp === form.ulp)
          .map(r => r.penyulang)
          .filter(Boolean)
      )
    )
  }, [asetRows, form.ulp])

  const zonaList = useMemo(() => {
    if (!form.penyulang) return []

    return Array.from(
      new Set(
        asetRows
          .filter(r => r.penyulang === form.penyulang)
          .map(r => r.zona)
          .filter(Boolean)
      )
    )
  }, [asetRows, form.penyulang])

  const sectionList = useMemo(() => {
    if (!form.zonaProteksi) return []

    return Array.from(
      new Set(
        asetRows
          .filter(r => r.zona === form.zonaProteksi)
          .map(r => r.section)
          .filter(Boolean)
      )
    )
  }, [asetRows, form.zonaProteksi])

  const panjangKmsList = useMemo(() => {
    if (!form.section) return []

    return Array.from(
      new Set(
        asetRows
          .filter(r =>
            r.ulp === form.ulp &&
            r.penyulang === form.penyulang &&
            r.zona === form.zonaProteksi &&
            r.section === form.section
          )
          .map(r => String(r.kms))
          .filter(Boolean)
      )
    )
  }, [
    asetRows,
    form.ulp,
    form.penyulang,
    form.zonaProteksi,
    form.section,
  ])

  const isFormValid =
    Object.values(form).every(v => v.trim() !== '') &&
    fotoSebelum.length >= 2 &&
    fotoProses.length >= 1 &&
    fotoSesudah.length >= 2

  /* ================= SUBMIT ================= */

  const handleSubmit = async () => {
    const fd = new FormData()

    Object.entries(form).forEach(([k, v]) => fd.append(k, v))

    fotoSebelum.forEach((f, i) =>
      fd.append(`fotoSebelum${i + 1}`, f)
    )
    fotoProses.forEach((f, i) =>
      fd.append(`fotoProses${i + 1}`, f)
    )
    fotoSesudah.forEach((f, i) =>
      fd.append(`fotoSesudah${i + 1}`, f)
    )

    await fetch(API_URL, {
      method: 'POST',
      body: fd,
    })

    alert('Berhasil dikirim')
  }

  useEffect(() => {
    fetch(API_URL)
      .then(r => r.json())
      .then(res => {
        setAsetRows(res)
      })
  }, [])

  useEffect(() => {

    // 👉 kalau salah satu belum diisi / di-clear
    if (
      !form.ulp ||
      !form.penyulang ||
      !form.zonaProteksi ||
      !form.section
    ) {
      setForm(p => ({
        ...p,
        panjangKms: '',
      }))
      return
    }

    const row = asetRows.find(r =>
      String(r.ulp).trim() === form.ulp.trim() &&
      String(r.penyulang).trim() === form.penyulang.trim() &&
      String(r.zona).trim() === form.zonaProteksi.trim() &&
      String(r.section).trim() === form.section.trim()
    )

    if (row?.kms !== undefined && row?.kms !== null) {
      setForm(p => ({
        ...p,
        panjangKms: String(row.kms),
      }))
    } else {
      // 👉 kalau kombinasi tidak ketemu
      setForm(p => ({
        ...p,
        panjangKms: '',
      }))
    }

  }, [
    form.ulp,
    form.penyulang,
    form.zonaProteksi,
    form.section,
    asetRows,
  ])

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
          <h1 className="font-medium">Pemeliharaan JTM Form</h1>
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

          <div className="flex-1 overflow-y-auto pr-6">

            {/* FORM UTAMA */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">

              {/* ================= KIRI ================= */}
              <div className="flex flex-col gap-8">

                <Input label="UP3" value={form.up3} readOnly />

                <PopupSelect
                  label="ULP"
                  value={form.ulp}
                  options={ULP_LIST}
                  onSave={v => {
                    handleChange('ulp', v)
                    handleChange('penyulang', '')
                    handleChange('zonaProteksi', '')
                    handleChange('section', '')
                  }}
                  onClear={() => handleChange('ulp', '')}
                />

                <PopupSelect
                  label="Penyulang"
                  value={form.penyulang}
                  options={penyulangList}
                  disabled={!form.ulp}
                  onSave={v => {
                    handleChange('penyulang', v)
                    handleChange('zonaProteksi', '')
                    handleChange('section', '')
                  }}
                  onClear={() => handleChange('penyulang', '')}
                />

                <PopupSelect
                  label="Zona Proteksi"
                  value={form.zonaProteksi}
                  options={zonaList}
                  disabled={!form.penyulang}
                  onSave={v => {
                    handleChange('zonaProteksi', v)
                    handleChange('section', '')
                  }}
                  onClear={() => handleChange('zonaProteksi', '')}
                />

                <PopupSelect
                  label="Section"
                  value={form.section}
                  options={sectionList}
                  disabled={!form.zonaProteksi}
                  onSave={v => handleChange('section', v)}
                  onClear={() => handleChange('section', '')}
                />

                {/* PANJANG KMS — auto dari aset + tetap bisa diketik + ada + - */}
                <NumberStepper
                  label="Panjang Km/s"
                  value={form.panjangKms}
                  onChange={v => handleChange('panjangKms', v)}
                />

                <PopupSelect
                  label="Mengapa JTM dipelihara?"
                  value={form.alasan}
                  options={['Gangguan', 'Usia Peralatan', 'Hasil Inspeksi']}
                  onSave={v => handleChange('alasan', v)}
                  onClear={() => handleChange('alasan', '')}
                />

              </div>

              {/* ================= KANAN ================= */}
              <div className="flex flex-col gap-8">

                <PopupSelect
                  label="Apa yang dilakukan?"
                  value={form.pemeliharaan}
                  options={[
                    'Pemeliharaan Preventif',
                    'Pemeliharaan Korektif',
                    'Inspeksi Rutin',
                  ]}
                  onSave={v => handleChange('pemeliharaan', v)}
                  onClear={() => handleChange('pemeliharaan', '')}
                />

                <Input
                  label="Tanggal Pemeliharaan"
                  type="date"
                  value={form.tanggalPemeliharaan}
                  onChange={e =>
                    handleChange('tanggalPemeliharaan', e.target.value)
                  }
                />

                <Input
                  label="Dieksekusi oleh?"
                  value={form.dieksekusiOleh}
                  onChange={e =>
                    handleChange('dieksekusiOleh', e.target.value)
                  }
                />

                <NumberStepper
                  label="Jumlah item material"
                  value={form.jumlahItemMaterial}
                  onChange={v =>
                    handleChange('jumlahItemMaterial', v)
                  }
                />

                <NumberStepper
                  label="Nilai Tahanan Isolasi Sesudah"
                  value={form.NilaiTahananIsolasiSesudah}
                  onChange={v =>
                    handleChange('NilaiTahananIsolasiSesudah', v)
                  }
                />

                <NumberStepper
                  label="Nilai Pentanahan Setelah Perbaikan"
                  value={form.nilaiPertanahan}
                  onChange={v =>
                    handleChange('nilaiPertanahan', v)
                  }
                />

                <Input
                  label="Keterangan"
                  value={form.keterangan}
                  onChange={e =>
                    handleChange('keterangan', e.target.value)
                  }
                />
              </div>
            </div>

            {/* KOORDINAT */}
            <div className="mt-10 w-full">
              <label className="text-sm font-semibold">
                Koordinat <span className="text-red-500">*</span>
              </label>

              <div className="mt-2 relative">
                <input
                  value={form.koordinat}
                  onChange={e => handleChange("koordinat", e.target.value)}
                  className="w-full py-3 pl-12 pr-5 border-2 border-[#2FA6DE] rounded-full"
                  placeholder="Klik ikon map untuk memilih lokasi"
                />

                {/* IKON MAP */}
                <button
                  type="button"
                  onClick={() => setShowMap(prev => !prev)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2FA6DE]"
                >
                  🗺️
                </button>
              </div>

              {/* MAP LANGSUNG DI BAWAH INPUT */}
              {showMap && (
                <div
                  className="mt-4 w-full rounded-xl border border-slate-300 bg-white"
                  style={{ height: 380 }}
                >
                  <div className="w-full h-full">
                    <MapPicker
                      koordinat={form.koordinat}
                      onChange={(v) => handleChange("koordinat", v)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* FOTO (PALING BAWAH, 3 KOTAK) */}
            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
              <MultiUploadPreview
                label="Foto Sebelum"
                files={fotoSebelum}
                setFiles={setFotoSebelum}
              />

              <MultiUploadPreview
                label="Foto Proses Pekerjaan"
                files={fotoProses}
                setFiles={setFotoProses}
              />

              <MultiUploadPreview
                label="Foto Sesudah"
                files={fotoSesudah}
                setFiles={setFotoSesudah}
              />
            </div>

            {/* ACTION */}
            <div className="flex gap-4 mt-12 justify-center">
              <button className="px-12 py-3 bg-red-500 text-white rounded-full">
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isFormValid}
                className={`px-12 py-3 rounded-full text-white ${isFormValid
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
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
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

/* =========== MULTI UPLOAD (DESAIN TETAP 1 KOTAK) =========== */

type MultiUploadPreviewProps = {
  label: string
  files: File[]
  setFiles: (f: File[]) => void
}

function MultiUploadPreview({
  label,
  files,
  setFiles,
}: MultiUploadPreviewProps) {
  const [open, setOpen] = useState<number | null>(null)

  const previews = files.map(f => URL.createObjectURL(f))

  return (
    <>
      <div>
        <label className="text-sm font-semibold">
          {label} <span className="text-red-500">*</span>
        </label>

        <div className="relative mt-2 h-[220px] border-2 border-dashed border-[#2FA6DE] rounded-2xl flex flex-wrap items-center justify-center gap-2 p-2">

          {previews.map((src, i) => (
            <div key={i} className="relative h-20 w-20">
              <img
                src={src}
                className="h-full w-full object-cover rounded cursor-pointer"
                onClick={() => setOpen(i)}
              />

              <button
                type="button"
                onClick={() =>
                  setFiles(files.filter((_, x) => x !== i))
                }
                className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center"
              >
                <IoClose size={12} />
              </button>
            </div>
          ))}

          <label className="cursor-pointer text-gray-400">
            + Upload
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={e => {
                if (!e.target.files) return
                setFiles([...files, ...Array.from(e.target.files)])
              }}
            />
          </label>
        </div>
      </div>

      {open !== null && previews[open] && (
        <div
          onClick={() => setOpen(null)}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
        >
          <img
            src={previews[open]}
            className="max-w-[90vw] max-h-[90vh] rounded-xl"
          />
        </div>
      )}
    </>
  )
}

/* ================= POPUP SELECT ================= */

type PopupSelectProps = {
  label: string
  value: string
  options: string[]
  onSave: (value: string) => void
  onClear: () => void
  disabled?: boolean
}

function PopupSelect({
  label,
  value,
  options,
  onSave,
  onClear,
  disabled = false,
}: PopupSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = options.filter(o =>
    o.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div
        onClick={() => !disabled && setOpen(true)}
        className={`cursor-pointer ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
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
              onChange={e => setSearch(e.target.value)}
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

/* ================= INPUT ================= */

type InputProps = {
  label: string
  value: string
  type?: string
  readOnly?: boolean
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
}

function Input({
  label,
  value,
  type = 'text',
  onChange,
  readOnly = false,
}: InputProps) {
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
