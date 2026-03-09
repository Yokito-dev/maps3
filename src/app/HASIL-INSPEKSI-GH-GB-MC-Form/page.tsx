'use client'

import { useMemo, useState, ChangeEvent, useEffect } from 'react'
import Image from 'next/image'
import { IoArrowBack, IoChevronDown, IoClose } from 'react-icons/io5'
import { useRouter } from 'next/navigation'

import bg from '@/app/assets/plnup3/bgnogradient.png'
import plnKecil from '@/app/assets/plnup3/plnkecil.svg'

type SheetRow = {
  up3: string
  ulp?: string
  penyulang?: string
  zona?: string
}

export default function Page() {
  const router = useRouter()

  const sheetData: SheetRow[] = [
    { up3: 'UP3 MAKASSAR SELATAN' }
  ]

  const [form, setForm] = useState({
    up3: 'UP3 MAKASSAR SELATAN',
    ulp: '',
    tanggalInspeksi: '',
    penyulang: '',
    zona: '',
    isi: '',
    noP0: '',
    namaInput: '',
    namaGardu: '',
    longlat: '',
    statusMilik: '',
    jumlahTrafo: '',
    jumlahCell: '',
    komponen: '',
    cub1jenis: '',
    cub1ket: '',
    cub2jenis: '',
    cub2ket: '',
    cub3jenis: '',
    cub3ket: '',
    cub3relay: '',
    cub4jenis: '',
    cub4ket: '',
    cub4relay: '',
    jalurkabel: '',
    dsincoming: '',
    grounding: '',
    nilaiGrounding: '',
    ketkondisi: '',
    tegangankubikel: '',
    kebutuhanaspek: '',
    tindakan: '',
    statuspemeliharaan: '',
  })

  const handleChange = (key: keyof typeof form, val: string) => {
    setForm(prev => ({ ...prev, [key]: val ?? '' }))
  }

  const [fotoDepan, setFotoDepan] = useState<File | null>(null)
  const [fotoTemuan1, setFotoTemuan1] = useState<File | null>(null)
  const [fotoTemuan2, setFotoTemuan2] = useState<File | null>(null)
  const [fotoTemuan3, setFotoTemuan3] = useState<File | null>(null)

  const isFormValid =
    Object.values(form).every(v => v.trim() !== '') &&
    fotoDepan &&
    fotoTemuan1 &&
    fotoTemuan2 &&
    fotoTemuan3

  return (
    <div className="h-screen flex flex-col font-poppins overflow-hidden">

      <div className="fixed inset-0 -z-10">
        <Image src={bg} alt="bg" fill className="object-cover" priority />
      </div>
      <div className="fixed inset-0 -z-10 bg-gradient-to-t from-[#165F67]/70 via-[#67C2E9]/30 to-transparent backdrop-blur-sm" />

      <div className="px-4 pt-3">
        <div className="bg-white rounded-full shadow px-6 py-2 flex items-center gap-3">
          <button onClick={() => router.push('/menu')}>
            <IoArrowBack size={22} />
          </button>
          <Image src={plnKecil} alt="pln" width={34} />
          <h1 className="font-medium">Hasil Inspeksi GH GB MC</h1>
        </div>
      </div>

      <main className="flex-1 flex justify-center items-start px-0 pt-4 md:p-4 overflow-hidden">
        <div className="bg-white shadow-xl w-full flex flex-col h-full overflow-hidden rounded-t-[28px] rounded-b-none px-5 py-6 md:h-[82vh] md:rounded-3xl md:p-10 md:max-w-[1200px]">
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">

              {/* ===== UTAMA */}

              <Input label="UP3" value={form.up3} readOnly />

              <Input
                label="Nama Penginput"
                value={form.namaInput}
                onChange={e => handleChange('namaInput', e.target.value)}
              />

              <PopupSelect
                label="ULP"
                value={form.ulp}
                options={['PANAKKUKANG', 'SUNGGUMINASA', 'MALINO']}
                onSave={v => setForm(prev => ({ ...prev, ulp: v, penyulang: '', zona: '' }))}
                onClear={() => setForm(prev => ({ ...prev, ulp: '', penyulang: '', zona: '' }))}
              />

              <Input
                label="TIMESTAMP"
                type="date"
                value={form.tanggalInspeksi}
                onChange={e => handleChange('tanggalInspeksi', e.target.value)}
              />

              <PopupSelect
                label="Penyulang"
                value={form.penyulang}
                options={['A', 'B', 'C']}
                disabled={!form.ulp}
                onSave={v => setForm(prev => ({ ...prev, penyulang: v, zona: '' }))}
                onClear={() => setForm(prev => ({ ...prev, penyulang: '', zona: '' }))}
              />

              <Input
                label="No P0"
                value={form.noP0}
                onChange={e => handleChange('noP0', e.target.value)}
              />

              <PopupSelect
                label="Zona Proteksi"
                value={form.zona}
                options={['Zona 1', 'Zona 2', 'Zona 3']}
                disabled={!form.penyulang}
                onSave={v => handleChange('zona', v)}
                onClear={() => handleChange('zona', '')}
              />

              {/* ===== SISANYA DIURUTKAN LOGIS ===== */}

              <PopupSelect
                label="Nama Gardu GH GB MC"
                value={form.namaGardu}
                options={['GH', 'GB', 'MC']}
                onSave={v => handleChange('namaGardu', v)}
                onClear={() => handleChange('namaGardu', '')}
              />

              <Input
                label="LONG / LAT"
                value={form.longlat}
                placeholder="Input LONG / LAT"
                onChange={e => handleChange('longlat', e.target.value)}
              />

              <PopupSelect
                label="Status Area Milik"
                value={form.statusMilik}
                options={['PLN', 'B']}
                onSave={v => handleChange('statusMilik', v)}
                onClear={() => handleChange('statusMilik', '')}
              />

              <NumberStepper
                label="Jumlah Trafo"
                value={form.jumlahTrafo}
                onChange={v => handleChange('jumlahTrafo', v)}
              />

              <NumberStepper
                label="Jumlah Cell"
                value={form.jumlahCell}
                onChange={v => handleChange('jumlahCell', v)}
              />

              <PopupSelect
                label="Komponen"
                value={form.komponen}
                options={['OPEN CELL/KUBIKEL', 'CLOSED CELL/KUBIKEL']}
                onSave={v => handleChange('komponen', v)}
                onClear={() => handleChange('komponen', '')}
              />

              {/* ===== CUB 1-4 ===== */}

              <PopupSelect label="CUB 1 (JENIS)" value={form.cub1jenis} options={['INCOMING', 'B']} onSave={v => handleChange('cub1jenis', v)} onClear={() => handleChange('cub1jenis', '')} />
              <PopupSelect label="CUB 1 (KET)" value={form.cub1ket} options={['A', 'B']} onSave={v => handleChange('cub1ket', v)} onClear={() => handleChange('cub1ket', '')} />

              <PopupSelect label="CUB 2 (JENIS)" value={form.cub2jenis} options={['INCOMING', 'B']} onSave={v => handleChange('cub2jenis', v)} onClear={() => handleChange('cub2jenis', '')} />
              <PopupSelect label="CUB 2 (KET)" value={form.cub2ket} options={['A', 'B']} onSave={v => handleChange('cub2ket', v)} onClear={() => handleChange('cub2ket', '')} />

              <PopupSelect label="CUB 3 (JENIS)" value={form.cub3jenis} options={['INCOMING', 'B']} onSave={v => handleChange('cub3jenis', v)} onClear={() => handleChange('cub3jenis', '')} />
              <PopupSelect label="CUB 3 (KET)" value={form.cub3ket} options={['A', 'B']} onSave={v => handleChange('cub3ket', v)} onClear={() => handleChange('cub3ket', '')} />
              <PopupSelect label="CUB 3 (RELAY)" value={form.cub3relay} options={['INCOMING', 'B']} onSave={v => handleChange('cub3relay', v)} onClear={() => handleChange('cub3relay', '')} />

              <PopupSelect label="CUB 4 (JENIS)" value={form.cub4jenis} options={['INCOMING', 'B']} onSave={v => handleChange('cub4jenis', v)} onClear={() => handleChange('cub4jenis', '')} />
              <PopupSelect label="CUB 4 (KET)" value={form.cub4ket} options={['A', 'B']} onSave={v => handleChange('cub4ket', v)} onClear={() => handleChange('cub4ket', '')} />
              <PopupSelect label="CUB 4 (RELAY)" value={form.cub4relay} options={['INCOMING', 'B']} onSave={v => handleChange('cub4relay', v)} onClear={() => handleChange('cub4relay', '')} />

              {/* ===== INFRASTRUKTUR & KONDISI ===== */}

              <PopupSelect label="Jalur Kabel Tanah" value={form.jalurkabel} options={['TIDAK ADA (TERGELAR DI LANTAI/TANAH)', 'B']} onSave={v => handleChange('jalurkabel', v)} onClear={() => handleChange('jalurkabel', '')} />
              <PopupSelect label="DS INCOMING GH/GB" value={form.dsincoming} options={['TIDAK LENGKAP', 'B']} onSave={v => handleChange('dsincoming', v)} onClear={() => handleChange('dsincoming', '')} />
              <PopupSelect label="Grounding" value={form.grounding} options={['ADA', 'TIDAK ADA']} onSave={v => handleChange('grounding', v)} onClear={() => handleChange('grounding', '')} />
              <PopupSelect label="Nilai Grounding" value={form.nilaiGrounding} options={['>=10 OHM (BUTUH PERBAIKAN PENTANAHAN)', 'B']} onSave={v => handleChange('nilaiGrounding', v)} onClear={() => handleChange('nilaiGrounding', '')} />
              <PopupSelect label="KET KONDISI GH/GB/MC" value={form.ketkondisi} options={['2. EXHAUST FAN/AC TIDAK ADA/RUSAK', '5. KOTOR', '7. ATAP BOCOR']} onSave={v => handleChange('ketkondisi', v)} onClear={() => handleChange('ketkondisi', '')} />
              <PopupSelect label="Tegangan Kubikel" value={form.tegangankubikel} options={['A', 'B', 'C']} onSave={v => handleChange('tegangankubikel', v)} onClear={() => handleChange('tegangankubikel', '')} />
              <PopupSelect label="Kebutuhan Aspek K3/L" value={form.kebutuhanaspek} options={['PEMBATAS TRAFO & KUBIKEL', 'APAR', 'CCTV', 'PEMASANGAN HYGROMETER/KELEMBABAN RUANGAN', 'SILIKA GEL', 'LAMPU PENERANGAN']} onSave={v => handleChange('kebutuhanaspek', v)} onClear={() => handleChange('kebutuhanaspek', '')} />
              <PopupSelect label="Tindakan" value={form.tindakan} options={['HANYA INSPEKSI', 'B']} onSave={v => handleChange('tindakan', v)} onClear={() => handleChange('tindakan', '')} />
              <PopupSelect label="Status Pemeliharaan" value={form.statuspemeliharaan} options={['BUTUH HAR ONLINE', 'B']} onSave={v => handleChange('statuspemeliharaan', v)} onClear={() => handleChange('statuspemeliharaan', '')} />

            </div>

            {/* FOTO SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
              <UploadPreview label="FOTO TAMPAK DEPAN" file={fotoDepan} setFile={setFotoDepan} />
              <UploadPreview label="FOTO TEMUAN KONDISI GH (1)" file={fotoTemuan1} setFile={setFotoTemuan1} />
              <UploadPreview label="FOTO TEMUAN KONDISI GH (2)" file={fotoTemuan2} setFile={setFotoTemuan2} />
              <UploadPreview label="FOTO TEMUAN KONDISI GH (3)" file={fotoTemuan3} setFile={setFotoTemuan3} />
            </div>


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

/* ================= POPUP SELECT ================= */

function PopupSelect({
  label,
  value,
  options,
  onSave,
  onClear,
  disabled,
}: {
  label: string
  value: string
  options: string[]
  onSave: (v: string) => void
  onClear: () => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (open) setSearch('')
  }, [open])

  const filtered = (options || []).filter(o =>
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

function Input({
  label,
  value,
  type = 'text',
  readOnly = false,
  placeholder,
  onChange,
}: {
  label: string
  value: string
  type?: string
  readOnly?: boolean
  placeholder?: string
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
}) {

  const isEmpty = !value

  return (
    <div>
      <label className="text-sm font-semibold">
        {label} <span className="text-red-500">*</span>
      </label>

      <input
        type={type}
        value={value ?? ''}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={onChange}
        className={`mt-2 w-full py-3 px-5 border-2 border-[#2FA6DE] rounded-full
          ${readOnly ? 'bg-gray-100' : ''}
          ${type === 'date' && isEmpty ? 'text-gray-400' : 'text-black'}
        `}
      />
    </div>
  )
}
/* ================= UPLOAD ================= */

function UploadPreview({
  label,
  file,
  setFile,
}: {
  label: string
  file: File | null
  setFile: (file: File | null) => void
}) {
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
                onClick={() => setOpen(true)}
                className="max-h-full cursor-pointer"
              />
              <button
                onClick={() => setFile(null)}
                className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center"
              >
                <IoClose />
              </button>
            </>
          ) : (
            <label className="cursor-pointer text-gray-400">
              Klik untuk upload foto
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={e =>
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
            className="max-w-[90vw] max-h-[90vh] rounded-xl"
          />
        </div>
      )}
    </>
  )
}

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
          onChange={(e) => {
            const val = e.target.value

            // hanya izinkan angka & kosong
            if (/^\d*$/.test(val)) {
              onChange(val)
            }
          }}
          className="flex-1 py-3 px-5 border-2 border-[#2FA6DE] rounded-full outline-none"
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