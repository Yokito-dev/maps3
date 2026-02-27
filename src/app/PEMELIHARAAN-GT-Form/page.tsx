'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState, ChangeEvent, useEffect } from 'react'
import Image from 'next/image'
import { IoArrowBack, IoChevronDown, IoClose, IoAdd, IoLocationSharp } from 'react-icons/io5'
import { useRouter } from 'next/navigation'

import bg from '@/app/assets/plnup3/bgnogradient.png'
import plnKecil from '@/app/assets/plnup3/plnkecil.svg'

/* ================= MAP (client only) ================= */

const MapPicker = dynamic(() => import('../components/MapPicker'), { ssr: false }),

/* ================= API ================= */

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

  alasan: string[]
  pemeliharaan: string[]

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

const uniquePretty = (arr: any[]) => {
  const m = new Map<string, string>()
  for (const v of arr) {
    const raw = String(v ?? '').trim()
    const k = norm(raw)
    if (k && !m.has(k)) m.set(k, raw)
  }
  return Array.from(m.values()).sort()
}

const pickUnique = (vals: string[]) => {
  const u = uniquePretty(vals)
  return u.length === 1 ? u[0] : ''
}

const fmtCoord = (n: number) => {
  if (!Number.isFinite(n)) return ''
  return n.toFixed(6)
}

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

  // ✅ avoid SSR/client mismatch
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

  /* ========= FETCH ASET ========= */

  const [aset, setAset] = useState<AsetGdRow[]>([])
  const [asetLoading, setAsetLoading] = useState(false)
  const [asetError, setAsetError] = useState<string>('')

  useEffect(() => {
    const run = async () => {
      try {
        setAsetLoading(true)
        setAsetError('')

        const res = await fetch(`${API_URL}?type=aset&_=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
        })
        const json = (await res.json()) as {
          data?: AsetGdRow[]
          ok?: boolean
          error?: boolean
          message?: string
        }

        if (!res.ok || json?.error || json?.ok === false) throw new Error(json?.message || `HTTP ${res.status}`)

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

  /* ========= MAP: icon only, when opened => LIVE by default =========
     - Autofill longlat from DB still happens on namaGardu change
     - But user can always edit longlat (input + map)
     - When map opens => starts live GPS and updates longlat
     - If user edits or taps map => stop live (so it won't overwrite manual choice)
  */

  const [showMap, setShowMap] = useState(false)
  const [tracking, setTracking] = useState(false)
  const [geoError, setGeoError] = useState('')

  const openMapLive = () => {
    setShowMap(true)
    setGeoError('')
    setTracking(true) // ✅ live by default when opened
  }

  const closeMap = () => {
    setShowMap(false)
    setTracking(false)
    setGeoError('')
  }

  useEffect(() => {
    if (!tracking) return

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGeoError('Perangkat tidak mendukung GPS (Geolocation).')
      setTracking(false)
      return
    }

    const id = navigator.geolocation.watchPosition(
      pos => {
        const lat = fmtCoord(pos.coords.latitude)
        const lng = fmtCoord(pos.coords.longitude)
        const v = lat && lng ? `${lat},${lng}` : ''
        if (v) setForm(p => ({ ...p, longlat: v }))
      },
      err => {
        setGeoError(err?.message || 'Gagal mengambil lokasi GPS.')
        setTracking(false)
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    )

    return () => navigator.geolocation.clearWatch(id)
  }, [tracking])

  /* ========= BASE ROWS ========= */

  const baseUp3Rows = useMemo(() => aset.filter(a => norm(a.up3) === norm(form.up3)), [aset, form.up3])

  /* ========= ALWAYS SHOW OPTIONS (penyulang/zona/section always ALL) ========= */

  const ULP_LIST = useMemo(() => uniquePretty(baseUp3Rows.map(a => a.ulp)), [baseUp3Rows])

  const NAMA_GARDU_LIST = useMemo(() => {
    const all = uniquePretty(baseUp3Rows.map(a => a.namaGardu))
    if (!form.ulp) return all
    const filtered = uniquePretty(baseUp3Rows.filter(a => norm(a.ulp) === norm(form.ulp)).map(a => a.namaGardu))
    return filtered.length ? filtered : all
  }, [baseUp3Rows, form.ulp])

  const ALL_PENYULANG_LIST = useMemo(() => uniquePretty(baseUp3Rows.map(a => a.penyulang)), [baseUp3Rows])
  const PENYULANG_LIST = useMemo(() => ALL_PENYULANG_LIST, [ALL_PENYULANG_LIST])

  const ALL_ZONA_LIST = useMemo(() => uniquePretty(baseUp3Rows.map(a => a.zona)), [baseUp3Rows])
  const ZONA_LIST = useMemo(() => ALL_ZONA_LIST, [ALL_ZONA_LIST])

  const ALL_SECTION_LIST = useMemo(() => uniquePretty(baseUp3Rows.map(a => a.section)), [baseUp3Rows])
  const SECTION_LIST = useMemo(() => ALL_SECTION_LIST, [ALL_SECTION_LIST])

  /* ========= PAIRING AUTOFILL ========= */

  // ULP changes => reset
  useEffect(() => {
    setForm(prev => ({
      ...prev,
      namaGardu: '',
      longlat: '',
      fasa: '',
      penyulang: '',
      zona: '',
      section: '',
    }))
    closeMap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.ulp])

  // namaGardu changes => autofill fields including longlat (still editable)
  useEffect(() => {
    if (!form.namaGardu) return

    const rowsForGardu = baseUp3Rows.filter(a => {
      if (form.ulp && norm(a.ulp) !== norm(form.ulp)) return false
      return norm(a.namaGardu) === norm(form.namaGardu)
    })

    const row0 = rowsForGardu[0]
    const uniqueP = pickUnique(rowsForGardu.map(r => r.penyulang))
    const uniqueZ = pickUnique(rowsForGardu.map(r => r.zona))
    const uniqueS = pickUnique(rowsForGardu.map(r => r.section))

    setForm(prev => {
      let nextP = prev.penyulang
      if (nextP && !ALL_PENYULANG_LIST.some(o => norm(o) === norm(nextP))) nextP = ''
      if (!nextP && uniqueP) nextP = uniqueP

      return {
        ...prev,
        longlat: row0?.longlat || '', // ✅ AUTOFILL even though editable
        kapasitas: row0?.kapasitas || prev.kapasitas || '0',
        fasa: row0?.fasa || '',
        penyulang: nextP,
        zona: uniqueZ || '',
        section: uniqueS || '',
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.namaGardu, form.ulp, baseUp3Rows, ALL_PENYULANG_LIST])

  // penyulang changes => autofill zona/section if unique
  useEffect(() => {
    if (!form.penyulang) return

    const rowsForP = baseUp3Rows.filter(a => {
      if (form.ulp && norm(a.ulp) !== norm(form.ulp)) return false
      return norm(a.penyulang) === norm(form.penyulang)
    })

    const uniqueG = !form.namaGardu ? pickUnique(rowsForP.map(r => r.namaGardu)) : ''
    const uniqueZ = pickUnique(rowsForP.map(r => r.zona))
    const uniqueS = pickUnique(rowsForP.map(r => r.section))

    setForm(prev => ({
      ...prev,
      zona: uniqueZ || '',
      section: uniqueS || '',
    }))

    if (uniqueG) handleChange('namaGardu', uniqueG)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.penyulang])

  // zona changes => autofill section if unique
  useEffect(() => {
    if (!form.zona) return

    const rowsForZ = baseUp3Rows.filter(a => {
      if (form.ulp && norm(a.ulp) !== norm(form.ulp)) return false
      if (form.namaGardu && norm(a.namaGardu) !== norm(form.namaGardu)) return false
      if (form.penyulang && norm(a.penyulang) !== norm(form.penyulang)) return false
      return norm(a.zona) === norm(form.zona)
    })

    const uniqueS = pickUnique(rowsForZ.map(r => r.section))
    setForm(prev => ({ ...prev, section: uniqueS || prev.section }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.zona])

  // Clear ghost values after refresh
  useEffect(() => {
    if (form.penyulang && !ALL_PENYULANG_LIST.some(o => norm(o) === norm(form.penyulang))) {
      setForm(prev => ({ ...prev, penyulang: '' }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ALL_PENYULANG_LIST])

  useEffect(() => {
    if (form.zona && !ALL_ZONA_LIST.some(o => norm(o) === norm(form.zona))) {
      setForm(prev => ({ ...prev, zona: '' }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ALL_ZONA_LIST])

  useEffect(() => {
    if (form.section && !ALL_SECTION_LIST.some(o => norm(o) === norm(form.section))) {
      setForm(prev => ({ ...prev, section: '' }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ALL_SECTION_LIST])

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
    isNonEmpty(form.longlat) && // ✅ required, user can adjust
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
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.message || `HTTP ${res.status}`)
      }

      const warnings = Array.isArray(json?.warnings) ? json.warnings : []
      if (warnings.length) {
        showToast({ variant: 'warning', title: 'Tersimpan, tapi ada catatan', message: warnings.join(' • ') })
      } else {
        showToast({ variant: 'success', title: 'Berhasil ✅', message: 'Data sudah masuk ke PEMELIHARAAN GT' })
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
      closeMap()
    } catch (e: any) {
      showToast({ variant: 'error', title: 'Gagal ❌', message: e?.message || 'Submit gagal' })
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
    closeMap()
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
                  <span className="text-gray-500">(dropdown tetap tampil semua opsi)</span>
                </div>
              )}
            </div>

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
                disabled={!form.ulp}
                searchable
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
                disabled={!form.ulp}
                searchable
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
                disabled={!form.ulp}
                onSave={v => handleChange('section', v)}
                onClear={() => handleChange('section', '')}
              />

              <NumberStepper label="Kapasitas" value={form.kapasitas} onChange={v => handleChange('kapasitas', v)} />

              {/* LONG/LAT editable + icon */}
              <div className="md:col-span-2">
                <label className="text-sm font-semibold">
                  LONG / LAT <span className="text-red-500">*</span>
                </label>

                <div className="mt-2">
                  <div className="relative">
                    <input
                      value={form.longlat}
                      onChange={e => {
                        // user manual change -> stop live so it doesn't overwrite
                        if (tracking) setTracking(false)
                        handleChange('longlat', e.target.value)
                      }}
                      className="w-full py-3 pl-5 pr-12 border-2 border-[#2FA6DE] rounded-full"
                      placeholder="Contoh: -5.123456,119.123456"
                      autoComplete="off"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        if (showMap) closeMap()
                        else openMapLive()
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-dark"
                      title={showMap ? 'Tutup Map' : 'Buka Map (Live)'}
                    >
                      <IoLocationSharp size={20} />
                    </button>
                  </div>

                  {geoError && <div className="mt-2 text-xs text-red-600">{geoError}</div>}

                  {showMap && (
                    <div className="mt-3 w-full rounded-xl border border-slate-300 bg-white" style={{ height: 380 }}>
                      <div className="w-full h-full">
                        <MapPicker
                          koordinat={form.longlat}
                          onChange={(v: string) => {
                            // user picks on map -> stop live so selection stays
                            if (tracking) setTracking(false)
                            handleChange('longlat', v)
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {showMap && (
                    <div className="mt-2 text-[11px] text-gray-500">
                      Map dibuka otomatis dalam mode live. Kalau kamu edit input / pilih titik manual, live berhenti.
                      Tutup & buka map lagi untuk live ulang.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* FOTO */}
            <div className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-8">
              <UploadPreview label="Foto Sebelum" file={fotoSebelum} setFile={setFotoSebelum} />
              <UploadPreview label="Foto Proses" file={fotoProses} setFile={setFotoProses} />
              <UploadPreview label="Foto Sesudah" file={fotoSesudah} setFile={setFotoSesudah} />
              <UploadPreview label="Lampiran BA Penggantian" file={fotoLampiranBA} setFile={setFotoLampiranBA} />
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
          autoComplete="off"
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
                onChange={(e: ChangeEvent<HTMLInputElement>) => e.target.files && setFile(e.target.files[0])}
              />
            </label>
          )}
        </div>
      </div>

      {open && preview && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
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

  const safeOptions = Array.isArray(options) ? options.filter(Boolean) : []
  const filtered = searchable ? safeOptions.filter(o => o.toLowerCase().includes(search.toLowerCase())) : safeOptions

  const customCandidate = search.trim()
  const canAddCustom =
    allowCustom && searchable && customCandidate && !safeOptions.some(o => norm(o) === norm(customCandidate))

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
        <div onClick={() => setOpen(false)} className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white p-6 rounded-xl w-[700px] max-w-[92vw] max-h-[75vh] flex flex-col"
          >
            <h2 className="font-bold mb-3">{label}</h2>

            {searchable && (
              <input
                placeholder="Cari..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoComplete="off"
                name={`search_${label.replace(/\s+/g, '_')}`}
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

              {filtered.length === 0 ? (
                <div className="py-3 px-3 text-gray-500">Tidak ada opsi tersedia</div>
              ) : (
                filtered.map(o => {
                  const selected = norm(o) === norm(value)
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
                })
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

  const safeOptions = Array.isArray(options) ? options.filter(Boolean) : []
  const filtered = searchable ? safeOptions.filter(o => o.toLowerCase().includes(search.toLowerCase())) : safeOptions

  const displayText = useMemo(() => {
    if (value.length === 0) return `Pilih ${label}`
    if (displayMode === 'bullets') return value.map(v => `- ${v}`).join('\n')

    return value
      .map(v => {
        const idx = safeOptions.indexOf(v)
        return idx >= 0 ? `(${idx + 1}) ${v}` : v
      })
      .join(', ')
  }, [value, label, displayMode, safeOptions])

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
        <div onClick={() => setOpen(false)} className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white p-6 rounded-xl w-[700px] max-w-[92vw] max-h-[75vh] flex flex-col"
          >
            <h2 className="font-bold mb-3">{label}</h2>

            {searchable && (
              <input
                placeholder="Cari..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoComplete="off"
                name={`search_multi_${label.replace(/\s+/g, '_')}`}
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
                    className={`py-2 px-3 rounded-lg cursor-pointer flex items-start gap-3 ${
                      selected ? 'bg-[#E8F5FB]' : 'hover:bg-gray-100'
                    }`}
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
        autoComplete="off"
        className={`mt-2 w-full py-3 px-5 border-2 border-[#2FA6DE] rounded-full
          focus:outline-none focus:ring-2 focus:ring-[#2FA6DE]/30
          ${readOnly ? 'bg-gray-100' : 'bg-white'}
          ${isDateEmpty ? 'text-gray-400' : 'text-black'}`}
      />
    </div>
  )
}