'use client'

import { useMemo, useState, ChangeEvent, useEffect } from 'react'
import Image from 'next/image'
import { IoArrowBack, IoChevronDown, IoClose, IoAdd } from 'react-icons/io5'
import { useRouter } from 'next/navigation'

import bg from '@/app/assets/plnup3/bgnogradient.png'
import plnKecil from '@/app/assets/plnup3/plnkecil.svg'

/* ================= API (1 URL) ================= */

const API_URL =
  'https://script.google.com/macros/s/AKfycbyOI9u0Gi7byOWbF5NhIgf3BUSHahtj8y6Bmz0NezhzMNiHdioI1nef7JqWZ31fsw9AbQ/exec'

/* ================= TYPES ================= */

type AsetGdRow = {
  up3: string
  ulp: string
  namaGardu: string
  penyulang: string
  zona: string
  section: string
  longlat: string
  kapasitas: string
  fasa: string
}

type FormState = {
  up3: string
  ulp: string
  tanggalHar: string

  namaGardu: string
  longlat: string
  kapasitas: string
  fasa: string
  zona: string
  section: string
  penyulang: string

  alasan: string[] // MULTI
  pemeliharaan: string[] // MULTI

  dieksekusiOleh: string
  jumlahItemMaterial: string
}

type ImagePayload = { filename: string; mimeType: string; base64: string }

type ToastState = {
  open: boolean
  variant: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
}

/* ================= OPTIONS ================= */

const APA_YANG_DILAKUKAN_OPTIONS = [
  'Pemasangan/Pembongkaran kubikel air insulated motorized, Incoming CB 20 kV',
  'Pemasangan/Pembongkaran kubikel air insulated motorized, Outgoing (CB) 20 kV',
  'Pemasangan/Pembongkaran terminasi / end MOF Indoor three core',
  'Pemasangan/Pembongkaran elastimol 20 kV',
  'Membersihkan peralatan kubikel & catu daya (Offline)',
  'Penggantian kabel dan accessories',
  'Pemasangan dan setting relay',
  'Pemasangan dudukan kubikel',
  'Perbaikan pentanahan',
  'Perbaikan pintu gardu',
  'Pembersihan halaman gardu',
  'Pengecatan gardu MC',
  'Aktivasi relay dan heater kubikel',
]

const MENGAPA_GARDU_DIPELIHARA_OPTIONS = [
  'ADANYA FLASHOVER/KORONA/SUARA MENDESIS',
  'PERUBAHAN DARI OPEN CELL KE KUBIKEL',
  'POSISI PERALATAN DAN TRAFO TANPA SEKAT',
  'TIDAK ADANYA DUDUKAN KUBIKEL',
  'KONDISI RUANGAN SANGAT LEMBAB',
  'PANEL PHBTR KOTOR',
  'PIPA KABEL TIDAK ADA/RUSAK',
]

// ✅ FIX: sesuai screenshot kamu
const DIEKSEKUSI_OLEH_OPTIONS = [
  'TIM PDKB',
  'TIM HAR UP3',
  'TIM YANTEK',
  'PEGAWAI',
  'PT DEM',
  'PT NIRHA',
  'PT SBR',
  'PT DKE',
  'PT NUN',
  'PT LAKAWAN',
]

/* ================= HELPERS ================= */

const norm = (v: any) => String(v ?? '').trim().toUpperCase()

const fileToBase64Payload = (file: File) =>
  new Promise<ImagePayload>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.onload = () => {
      const res = String(reader.result || '')
      const base64 = res.includes(',') ? res.split(',')[1] : res
      resolve({
        filename: file.name || `image_${Date.now()}.jpg`,
        mimeType: file.type || 'image/jpeg',
        base64,
      })
    }
    reader.readAsDataURL(file)
  })

/* ================= PAGE ================= */

export default function Page() {
  const router = useRouter()

  // ✅ FIX Hydration mismatch: render only after mounted (avoid SSR HTML mismatch)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  /* ========= TOAST ========= */
  const [toast, setToast] = useState<ToastState>({
    open: false,
    variant: 'info',
    title: '',
    message: '',
  })

  const showToast = (t: Omit<ToastState, 'open'>) => {
    setToast({ open: true, ...t })
    window.setTimeout(() => setToast(p => ({ ...p, open: false })), 4500)
  }

  /* ========= FETCH ASET GD ========= */

  const [aset, setAset] = useState<AsetGdRow[]>([])
  const [asetLoading, setAsetLoading] = useState(false)
  const [asetError, setAsetError] = useState<string>('')

  useEffect(() => {
    const run = async () => {
      try {
        setAsetLoading(true)
        setAsetError('')

        const res = await fetch(`${API_URL}?type=aset`, { method: 'GET' })
        const json = (await res.json()) as { data?: AsetGdRow[]; error?: boolean; message?: string }

        if (!res.ok || json?.error) throw new Error(json?.message || `HTTP ${res.status}`)

        setAset(Array.isArray(json.data) ? json.data : [])
      } catch (e: any) {
        setAsetError(e?.message || 'Gagal mengambil data ASET GD')
        setAset([])
      } finally {
        setAsetLoading(false)
      }
    }

    if (mounted) run()
  }, [mounted])

  /* ========= FORM ========= */

  const [form, setForm] = useState<FormState>({
    up3: 'UP3 MAKASSAR SELATAN',
    ulp: '',
    tanggalHar: '',

    namaGardu: '',
    longlat: '',
    kapasitas: '0',
    fasa: '',
    zona: '',
    section: '',
    penyulang: '',

    alasan: [],
    pemeliharaan: [],

    dieksekusiOleh: '',
    jumlahItemMaterial: '0',
  })

  const handleChange = <K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm(p => ({ ...p, [key]: val }))
  }

  /* ========= DERIVED LISTS ========= */

  const ULP_LIST = useMemo(() => {
    const s = new Set(
      aset
        .filter(a => norm(a.up3) === norm(form.up3))
        .map(a => String(a.ulp || '').trim())
        .filter(Boolean)
    )
    return Array.from(s).sort()
  }, [aset, form.up3])

  const NAMA_GARDU_LIST = useMemo(() => {
    const s = new Set(
      aset
        .filter(a => norm(a.up3) === norm(form.up3) && norm(a.ulp) === norm(form.ulp))
        .map(a => String(a.namaGardu || '').trim())
        .filter(Boolean)
    )
    return Array.from(s).sort()
  }, [aset, form.up3, form.ulp])

  const PENYULANG_LIST = useMemo(() => {
    const s = new Set(
      aset
        .filter(
          a =>
            norm(a.up3) === norm(form.up3) &&
            norm(a.ulp) === norm(form.ulp) &&
            norm(a.namaGardu) === norm(form.namaGardu)
        )
        .map(a => String(a.penyulang || '').trim())
        .filter(Boolean)
    )
    return Array.from(s).sort()
  }, [aset, form.up3, form.ulp, form.namaGardu])

  const ZONA_LIST = useMemo(() => {
    const s = new Set(
      aset
        .filter(
          a =>
            norm(a.up3) === norm(form.up3) &&
            norm(a.ulp) === norm(form.ulp) &&
            norm(a.namaGardu) === norm(form.namaGardu)
        )
        .map(a => String(a.zona || '').trim())
        .filter(Boolean)
    )
    return Array.from(s).sort()
  }, [aset, form.up3, form.ulp, form.namaGardu])

  const SECTION_LIST = useMemo(() => {
    const s = new Set(
      aset
        .filter(
          a =>
            norm(a.up3) === norm(form.up3) &&
            norm(a.ulp) === norm(form.ulp) &&
            norm(a.namaGardu) === norm(form.namaGardu)
        )
        .map(a => String(a.section || '').trim())
        .filter(Boolean)
    )
    return Array.from(s).sort()
  }, [aset, form.up3, form.ulp, form.namaGardu])

  /* ========= AUTOFILL FROM ASET WHEN NAMA GARDU CHANGES ========= */

  useEffect(() => {
    if (!form.namaGardu) return

    const row = aset.find(
      a =>
        norm(a.up3) === norm(form.up3) &&
        norm(a.ulp) === norm(form.ulp) &&
        norm(a.namaGardu) === norm(form.namaGardu)
    )
    if (!row) return

    setForm(prev => ({
      ...prev,
      longlat: row.longlat || '',
      kapasitas: row.kapasitas || prev.kapasitas || '0',
      fasa: row.fasa || '',
      zona: row.zona || '',
      section: row.section || '',
      penyulang: row.penyulang || '',
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.namaGardu, aset])

  /* ========= CLEAR DEPENDENCIES WHEN ULP CHANGES ========= */

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      namaGardu: '',
      longlat: '',
      fasa: '',
      zona: '',
      section: '',
      penyulang: '',
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.ulp])

  /* ================= FOTO ================= */

  const [fotoSebelum, setFotoSebelum] = useState<File | null>(null)
  const [fotoProses, setFotoProses] = useState<File | null>(null)
  const [fotoSesudah, setFotoSesudah] = useState<File | null>(null)
  const [fotoLampiranBA, setFotoLampiranBA] = useState<File | null>(null)

  /* ================= VALIDASI ================= */

  const isNonEmpty = (v: unknown) => {
    if (Array.isArray(v)) return v.length > 0
    if (typeof v === 'string') return v.trim() !== ''
    return false
  }

  const isFormValid =
    isNonEmpty(form.up3) &&
    isNonEmpty(form.ulp) &&
    isNonEmpty(form.tanggalHar) &&
    isNonEmpty(form.namaGardu) &&
    isNonEmpty(form.penyulang) &&
    isNonEmpty(form.zona) &&
    isNonEmpty(form.section) &&
    isNonEmpty(form.pemeliharaan) &&
    isNonEmpty(form.alasan) &&
    isNonEmpty(form.dieksekusiOleh) &&
    isNonEmpty(form.jumlahItemMaterial) &&
    fotoSebelum &&
    fotoProses &&
    fotoSesudah &&
    fotoLampiranBA

  /* ================= SUBMIT ================= */

  const [submitting, setSubmitting] = useState(false)

  const alasanText = useMemo(() => {
    return form.alasan
      .map(v => {
        const idx = MENGAPA_GARDU_DIPELIHARA_OPTIONS.indexOf(v)
        return idx >= 0 ? `(${idx + 1}) ${v}` : v
      })
      .join(', ')
  }, [form.alasan])

  const pemeliharaanText = useMemo(() => {
    return form.pemeliharaan.map(v => `- ${v}`).join('\n')
  }, [form.pemeliharaan])

  const handleSubmit = async () => {
    if (!isFormValid || submitting) return

    try {
      setSubmitting(true)
      showToast({ variant: 'info', title: 'Mengirim...', message: 'Sedang upload foto & simpan data' })

      const [sebelum, proses, sesudah, ba] = await Promise.all([
        fileToBase64Payload(fotoSebelum!),
        fileToBase64Payload(fotoProses!),
        fileToBase64Payload(fotoSesudah!),
        fileToBase64Payload(fotoLampiranBA!),
      ])

      const payload = {
        type: 'pemeliharaanGT',
        data: {
          ...form,
          alasanText,
          pemeliharaanText,
        },
        images: {
          fotoSebelum: sebelum,
          fotoProses: proses,
          fotoSesudah: sesudah,
          fotoLampiranBA: ba,
        },
      }

      const res = await fetch(API_URL, {
        method: 'POST',
        // ✅ avoid preflight
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.message || `HTTP ${res.status}`)
      }

      const warnings = Array.isArray(json?.warnings) ? json.warnings : []
      if (warnings.length) {
        showToast({
          variant: 'warning',
          title: 'Tersimpan, tapi ada catatan',
          message: warnings.join(' • '),
        })
      } else {
        showToast({
          variant: 'success',
          title: 'Berhasil ✅',
          message: 'Data sudah masuk ke PEMELIHARAAN GT',
        })
      }

      // reset
      setForm(prev => ({
        ...prev,
        ulp: '',
        tanggalHar: '',
        namaGardu: '',
        longlat: '',
        kapasitas: '0',
        fasa: '',
        zona: '',
        section: '',
        penyulang: '',
        alasan: [],
        pemeliharaan: [],
        dieksekusiOleh: '',
        jumlahItemMaterial: '0',
      }))
      setFotoSebelum(null)
      setFotoProses(null)
      setFotoSesudah(null)
      setFotoLampiranBA(null)
    } catch (e: any) {
      showToast({
        variant: 'error',
        title: 'Gagal ❌',
        message: e?.message || 'Submit gagal',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    setForm(prev => ({
      ...prev,
      ulp: '',
      tanggalHar: '',
      namaGardu: '',
      longlat: '',
      kapasitas: '0',
      fasa: '',
      zona: '',
      section: '',
      penyulang: '',
      alasan: [],
      pemeliharaan: [],
      dieksekusiOleh: '',
      jumlahItemMaterial: '0',
    }))
    setFotoSebelum(null)
    setFotoProses(null)
    setFotoSesudah(null)
    setFotoLampiranBA(null)
    showToast({ variant: 'info', title: 'Dibatalkan', message: 'Form direset' })
  }

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center font-poppins">
        <div className="text-sm text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden font-poppins flex flex-col">
      <Toast toast={toast} onClose={() => setToast(p => ({ ...p, open: false }))} />

      {/* BACKGROUND */}
      <div className="fixed inset-0 -z-10">
        <Image src={bg} alt="Background" fill className="object-cover" priority />
      </div>
      <div className="fixed inset-0 -z-10 bg-gradient-to-t from-[#165F67]/70 via-[#67C2E9]/30 to-transparent backdrop-blur-sm" />

      {/* HEADER */}
      <div className="px-4 pt-3">
        <div className="bg-white rounded-full shadow px-6 py-2 flex items-center gap-3">
          <button type="button" onClick={() => router.push('/menu')}>
            <IoArrowBack size={22} />
          </button>
          <Image src={plnKecil} alt="pln" width={34} />
          <h1 className="font-medium">Pemeliharaan GT Form</h1>
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
          <div className="flex-1 overflow-y-auto pr-4">
            {/* STATUS */}
            <div className="mb-6">
              {asetLoading && <div className="text-sm text-gray-500">Memuat data ASET GD...</div>}
              {!asetLoading && asetError && (
                <div className="text-sm text-red-600">
                  Error fetch ASET: {asetError}{' '}
                  <span className="text-gray-500">(ULP tetap bisa dipilih/manual)</span>
                </div>
              )}
            </div>

            {/* FORM */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
              <Input label="UP3" value={form.up3} readOnly />

              <Input
                label="Tanggal HAR Gardu"
                type="date"
                value={form.tanggalHar}
                onChange={e => handleChange('tanggalHar', e.target.value)}
              />

              <PopupSelect
                label="ULP"
                value={form.ulp}
                options={ULP_LIST}
                searchable
                allowCustom
                onSave={v => handleChange('ulp', v)}
                onClear={() => handleChange('ulp', '')}
                disabled={asetLoading}
              />

              <PopupSelect
                label="Dieksekusi oleh?"
                value={form.dieksekusiOleh}
                options={DIEKSEKUSI_OLEH_OPTIONS}
                searchable
                onSave={v => handleChange('dieksekusiOleh', v)}
                onClear={() => handleChange('dieksekusiOleh', '')}
              />

              <PopupSelect
                label="NAMA GARDU"
                value={form.namaGardu}
                options={NAMA_GARDU_LIST}
                searchable
                disabled={!form.ulp}
                onSave={v => handleChange('namaGardu', v)}
                onClear={() => handleChange('namaGardu', '')}
              />

              <PopupMultiSelect
                label="Mengapa Gardu dipelihara?"
                value={form.alasan}
                options={MENGAPA_GARDU_DIPELIHARA_OPTIONS}
                onSave={v => handleChange('alasan', v)}
                onClear={() => handleChange('alasan', [])}
                displayMode="commaNumbered"
                searchable
              />

              <PopupSelect
                label="Penyulang"
                value={form.penyulang}
                options={PENYULANG_LIST}
                disabled={!form.namaGardu}
                onSave={v => handleChange('penyulang', v)}
                onClear={() => handleChange('penyulang', '')}
              />

              <PopupMultiSelect
                label="Apa yang dilakukan?"
                value={form.pemeliharaan}
                options={APA_YANG_DILAKUKAN_OPTIONS}
                onSave={v => handleChange('pemeliharaan', v)}
                onClear={() => handleChange('pemeliharaan', [])}
                displayMode="bullets"
                searchable
              />

              <PopupSelect
                label="Zona Proteksi"
                value={form.zona}
                options={ZONA_LIST}
                disabled={!form.namaGardu}
                onSave={v => handleChange('zona', v)}
                onClear={() => handleChange('zona', '')}
              />

              <NumberStepper
                label="Jumlah item material"
                value={form.jumlahItemMaterial}
                onChange={v => handleChange('jumlahItemMaterial', v)}
              />

              <PopupSelect
                label="Section"
                value={form.section}
                options={SECTION_LIST}
                searchable
                disabled={!form.namaGardu}
                onSave={v => handleChange('section', v)}
                onClear={() => handleChange('section', '')}
              />

              <NumberStepper
                label="Kapasitas"
                value={form.kapasitas}
                onChange={v => handleChange('kapasitas', v)}
              />

              <div className="md:col-span-2">
                <LongLatSplit label="LONG / LAT" value={form.longlat} />
              </div>
            </div>

            {/* FOTO */}
            <div className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-8">
              <UploadPreview label="Foto Sebelum" file={fotoSebelum} setFile={setFotoSebelum} />
              <UploadPreview label="Foto Proses" file={fotoProses} setFile={setFotoProses} />
              <UploadPreview label="Foto Sesudah" file={fotoSesudah} setFile={setFotoSesudah} />
              <UploadPreview
                label="Lampiran BA Penggantian"
                file={fotoLampiranBA}
                setFile={setFotoLampiranBA}
              />
            </div>

            {/* ACTION */}
            <div className="flex gap-4 mt-12 justify-center">
              <button
                type="button"
                onClick={handleCancel}
                disabled={submitting}
                className="px-12 py-3 bg-red-500 text-white rounded-full disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isFormValid || submitting}
                className={`px-12 py-3 rounded-full text-white ${
                  isFormValid && !submitting ? 'bg-[#2FA6DE]' : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>

            {/* helper text if invalid */}
            {!isFormValid && (
              <div className="mt-6 text-xs text-gray-500 text-center">
                Lengkapi semua field & upload 4 foto untuk bisa Submit.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

/* ================= TOAST ================= */

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast.open) return null

  const styles =
    toast.variant === 'success'
      ? 'border-green-200 bg-green-50 text-green-800'
      : toast.variant === 'error'
      ? 'border-red-200 bg-red-50 text-red-800'
      : toast.variant === 'warning'
      ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
      : 'border-blue-200 bg-blue-50 text-blue-800'

  const dot =
    toast.variant === 'success'
      ? 'bg-green-500'
      : toast.variant === 'error'
      ? 'bg-red-500'
      : toast.variant === 'warning'
      ? 'bg-yellow-500'
      : 'bg-blue-500'

  return (
    <div className="fixed right-4 bottom-4 z-[9999] w-[360px] max-w-[92vw]">
      <div className={`border rounded-2xl shadow-lg px-4 py-3 ${styles}`}>
        <div className="flex items-start gap-3">
          <div className={`mt-1 w-3 h-3 rounded-full ${dot}`} />
          <div className="flex-1">
            <div className="font-semibold">{toast.title}</div>
            {toast.message && <div className="text-sm mt-1 leading-5">{toast.message}</div>}
          </div>
          <button type="button" onClick={onClose} className="opacity-70 hover:opacity-100">
            <IoClose size={18} />
          </button>
        </div>
      </div>
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
          className="flex-1 py-3 px-5 border-2 border-[#2FA6DE] rounded-full bg-white
            focus:outline-none focus:ring-2 focus:ring-[#2FA6DE]/30"
        />

        <button
          type="button"
          onClick={() => onChange(String(Math.max(0, num - 1)))}
          className="w-12 h-12 border rounded-full text-xl bg-white hover:bg-gray-50 active:scale-[0.98]"
        >
          −
        </button>

        <button
          type="button"
          onClick={() => onChange(String(num + 1))}
          className="w-12 h-12 border rounded-full text-xl bg-white hover:bg-gray-50 active:scale-[0.98]"
        >
          +
        </button>
      </div>
    </div>
  )
}

function LongLatSplit({ label, value }: { label: string; value: string }) {
  const parts = String(value || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  const left = parts[0] || ''
  const right = parts[1] || ''
  const empty = !left && !right

  return (
    <div>
      <label className="text-sm font-semibold">
        {label} <span className="text-red-500">*</span>
      </label>

      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          readOnly
          value={left}
          placeholder="Lat"
          className={`w-full py-3 px-5 border-2 border-[#2FA6DE] rounded-full
            focus:outline-none focus:ring-2 focus:ring-[#2FA6DE]/30
            bg-gray-100 ${empty && !left ? 'text-gray-400' : 'text-black'}`}
        />
        <input
          readOnly
          value={right}
          placeholder="Long"
          className={`w-full py-3 px-5 border-2 border-[#2FA6DE] rounded-full
            focus:outline-none focus:ring-2 focus:ring-[#2FA6DE]/30
            bg-gray-100 ${empty && !right ? 'text-gray-400' : 'text-black'}`}
        />
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

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

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
            <label className="cursor-pointer text-gray-400 select-none">
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
          <img src={preview} alt="preview-large" className="max-w-[90vw] max-h-[90vh] rounded-xl" />
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
  disabled?: boolean
  searchable?: boolean
  allowCustom?: boolean
}

function PopupSelect({
  label,
  value,
  options,
  onSave,
  onClear,
  disabled = false,
  searchable = false,
  allowCustom = false,
}: PopupSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = searchable
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options

  const customCandidate = search.trim()
  const canAddCustom =
    allowCustom && searchable && customCandidate && !options.includes(customCandidate)

  return (
    <>
      <div
        onClick={() => !disabled && setOpen(true)}
        className={`cursor-pointer ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <label className="text-sm font-semibold">
          {label} <span className="text-red-500">*</span>
        </label>

        <div
          className={`mt-2 px-5 py-3 rounded-full flex items-center justify-between border-2 transition
          ${value ? 'border-[#2FA6DE] bg-[#2FA6DE]/5' : 'border-[#2FA6DE]'} hover:bg-[#2FA6DE]/5`}
        >
          <span className={value ? '' : 'text-gray-400'}>{value || `Pilih ${label}`}</span>
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
            className="bg-white p-6 rounded-xl w-[700px] max-w-[92vw] max-h-[75vh] flex flex-col"
          >
            <h2 className="font-bold mb-3">{label}</h2>

            {searchable && (
              <input
                placeholder="Cari..."
                value={search}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                className="mb-3 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2FA6DE]/30"
              />
            )}

            <div className="overflow-y-auto flex-1">
              {canAddCustom && (
                <div
                  onClick={() => {
                    onSave(customCandidate)
                    setOpen(false)
                    setSearch('')
                  }}
                  className="py-2 px-3 rounded-lg cursor-pointer hover:bg-gray-100 font-semibold"
                >
                  Gunakan: &quot;{customCandidate}&quot;
                </div>
              )}

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
                      ${selected ? 'bg-[#E8F5FB] text-blue-600 font-semibold' : 'hover:bg-gray-100'}`}
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

/* ===== MULTI SELECT ===== */

type MultiDisplayMode = 'commaNumbered' | 'bullets'

type PopupMultiSelectProps = {
  label: string
  value: string[]
  options: string[]
  onSave: (value: string[]) => void
  onClear: () => void
  displayMode?: MultiDisplayMode
  searchable?: boolean
}

function PopupMultiSelect({
  label,
  value,
  options,
  onSave,
  onClear,
  displayMode = 'commaNumbered',
  searchable = false,
}: PopupMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [temp, setTemp] = useState<string[]>(value)

  useEffect(() => {
    if (open) setTemp(value)
  }, [open, value])

  const filtered = searchable
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options

  const displayText = useMemo(() => {
    if (value.length === 0) return `Pilih ${label}`
    if (displayMode === 'bullets') return value.map(v => `- ${v}`).join('\n')

    return value
      .map(v => {
        const idx = options.indexOf(v)
        return idx >= 0 ? `(${idx + 1}) ${v}` : v
      })
      .join(', ')
  }, [value, label, displayMode, options])

  const toggle = (opt: string) => {
    setTemp(prev => (prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]))
  }

  return (
    <>
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        <label className="text-sm font-semibold">
          {label} <span className="text-red-500">*</span>
        </label>

        <div
          className={`mt-2 px-5 py-3 rounded-full flex items-center justify-between border-2 transition
          ${value.length ? 'border-[#2FA6DE] bg-[#2FA6DE]/5' : 'border-[#2FA6DE]'} hover:bg-[#2FA6DE]/5`}
        >
          <div className={`flex-1 min-w-0 ${value.length ? '' : 'text-gray-400'}`}>
            <div className="whitespace-pre-line break-words leading-5">{displayText}</div>
          </div>

          <div className="ml-3 flex items-center gap-2">
            <IoAdd className="opacity-70" />
            <IoChevronDown />
          </div>
        </div>
      </div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white p-6 rounded-xl w-[700px] max-w-[92vw] max-h-[75vh] flex flex-col"
          >
            <h2 className="font-bold mb-3">{label}</h2>

            {searchable && (
              <input
                placeholder="Cari..."
                value={search}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                className="mb-3 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2FA6DE]/30"
              />
            )}

            <div className="overflow-y-auto flex-1">
              {filtered.map(o => {
                const selected = temp.includes(o)
                return (
                  <div
                    key={o}
                    onClick={() => toggle(o)}
                    className={`py-2 px-3 rounded-lg cursor-pointer flex items-start gap-3
                      ${selected ? 'bg-[#E8F5FB]' : 'hover:bg-gray-100'}`}
                  >
                    <input type="checkbox" checked={selected} readOnly className="mt-1" />
                    <div className={`${selected ? 'text-blue-600 font-semibold' : ''}`}>{o}</div>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => {
                  onClear()
                  setTemp([])
                  setOpen(false)
                  setSearch('')
                }}
                className="text-red-500"
              >
                Clear
              </button>

              <button
                onClick={() => {
                  onSave(temp)
                  setOpen(false)
                  setSearch('')
                }}
                className="px-6 py-2 rounded-lg bg-[#2FA6DE] text-white"
              >
                Simpan
              </button>
            </div>
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
          focus:outline-none focus:ring-2 focus:ring-[#2FA6DE]/30
          ${readOnly ? 'bg-gray-100' : 'bg-white'}
          ${isDateEmpty ? 'text-gray-400' : 'text-black'}
        `}
      />
    </div>
  )
}