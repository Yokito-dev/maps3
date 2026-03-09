'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState, ChangeEvent, useEffect } from 'react'
import Image from 'next/image'
import { IoArrowBack, IoChevronDown, IoClose, IoLocationSharp } from 'react-icons/io5'
import { useRouter } from 'next/navigation'

import bg from '@/app/assets/plnup3/bgnogradient.png'
import plnKecil from '@/app/assets/plnup3/plnkecil.svg'

const MapPicker = dynamic(() => import('../components/MapPicker'), { ssr: false })

const API_URL =
  'https://script.google.com/macros/s/AKfycbyCxXZWyPBCJsyuLZpeynkr6V5FGCsLZopQaUQTPRIMKA6vpXriueq26O1n-SrsK_ALfA/exec'

const DIEKSEKUSI_LIST: string[] = [
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

const APAYGDILAKUKAN_LIST: string[] = [
  'Penggantian / Pemasangan Isolator',
  'Penggantian / Pemasangan bending wire berisolasi',
  'Penggantian / Pemasangan Arrester jaring',
  'Pemasangan GSW',
  'Pemasangan Tombak Petir',
  'Rekonduktor',
  'Perbaikan Andongan',
  'Perbaikan Tiang Miring',
  'Penggantian JTM Rantas',
  'Perbaikan SKTM',
  'Perbaikan MVTIC',
  'PerbaikaN/Pemasangan Jumper',
  'Penggantian skun kabel',
  'Sisip tiang JTM',
  'Perbaikan / Pemasangan skur',
  'Perbaikan / Pemasangan tupang tarik',
  'Perbaikan / Pemasangan tupang tekan',
  'Penggantian FCO perc',
  'Penyesuaian rating fuselink perc',
  'Pemasangan / Penggantian DS',
  'Pemeliharaan LBS Manual',
  'Pembetonan pondasi tiang',
  'Penggantian / Konsul tiang',
  'Pemasangan cover Isolator',
  'Pemasangan penghalang panjat',
  'Perbaikan/Penggantian Arm Tie',
  'Pemasangan nameplate',
  'Pengecatan tiang besi',
  'Sambung baru kons percabangan',
  'Pemasangan skur Bambu',
]

const MENGAPAJTMDIPELIHARA_LIST: string[] = [
  'Isolator Flashover / Pecah / Retak Rambut',
  'Arrester jebol / rawan petir',
  'GSW rusak / rawan petir',
  'Rawan petir',
  'Penampang kecil / rawan pohon',
  'Andongan kendor',
  'Tiang miring',
  'JTM rantas',
  'SKTM Gangguan / Jebol / Rusak',
  'MVTIC / Jebol / Rusak',
  'Hotspot / paralel grup',
  'Andongan panjang / penyesuaian',
  'Skur putus / rusak / tidak ada',
  'Tupang tarik putus / rusak / tidak ada',
  'Tupang tekan jatuh / tidak ada',
  'FCO perc rusak / tidak ada',
  'Fuselink perc tidak sesuai (bypass)',
  'DS rusak / tidak ada',
  'LBS Manual perlu dipelihara',
  'Tiang JTM pendek / butuh Row',
  'Lokasi rawan binatang',
  'Traves miring / rusak',
  'Arm Tie rusak / miring',
  'Name plate JTM tidak ada',
  'Tiang besi berkarat',
  'Pengikat isolator rusak / tidak sesuai',
]

/* ================= HELPERS ================= */

// kompres keras biar aman
const fileToBase64 = (file: File) =>
  new Promise<{ name: string; type: string; data: string }>((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      try {
        const MAX_W = 700
        const MAX_BASE64_LEN = 420_000

        const scale = Math.min(1, MAX_W / img.width)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas not supported')

        ctx.drawImage(img, 0, 0, w, h)

        let q = 0.6
        let base64 = canvas.toDataURL('image/jpeg', q).split(',')[1] || ''

        while (base64.length > MAX_BASE64_LEN && q > 0.25) {
          q -= 0.07
          base64 = canvas.toDataURL('image/jpeg', q).split(',')[1] || ''
        }

        URL.revokeObjectURL(url)
        resolve({
          name: file.name.replace(/\.\w+$/, '.jpg'),
          type: 'image/jpeg',
          data: base64,
        })
      } catch (err) {
        URL.revokeObjectURL(url)
        reject(err)
      }
    }

    img.onerror = e => {
      URL.revokeObjectURL(url)
      reject(e)
    }

    img.src = url
  })

async function postToGAS(payload: any) {
  const r = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  })
  const data = await r.json().catch(async () => {
    const t = await r.text()
    return { status: 'error', message: t }
  })
  return data
}

/* ================= PAGE ================= */

export default function Page() {
  const router = useRouter()
  const [asetRows, setAsetRows] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState('')

  const ULP_LIST = useMemo(() => {
    return Array.from(new Set(asetRows.map(r => r.ulp).filter(Boolean)))
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

  const [fotoSebelum, setFotoSebelum] = useState<File[]>([])
  const [fotoProses, setFotoProses] = useState<File[]>([])
  const [fotoSesudah, setFotoSesudah] = useState<File[]>([])
  const [showMap, setShowMap] = useState(false)

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

<<<<<<< HEAD
  // foto boleh kosong
=======
>>>>>>> 97d8d466e1e4d2410e6fc725e89bef09a4963156
  const isFormValid = Object.values(form).every(v => String(v).trim() !== '')

  useEffect(() => {
    fetch(API_URL)
      .then(r => r.json())
      .then(res => setAsetRows(Array.isArray(res) ? res : []))
      .catch(() => setAsetRows([]))
  }, [])

  useEffect(() => {
    if (!form.ulp || !form.penyulang || !form.zonaProteksi || !form.section) {
      setForm(p => ({ ...p, panjangKms: '' }))
      return
    }

    const row = asetRows.find(r =>
      String(r.ulp).trim() === form.ulp.trim() &&
      String(r.penyulang).trim() === form.penyulang.trim() &&
      String(r.zona).trim() === form.zonaProteksi.trim() &&
      String(r.section).trim() === form.section.trim()
    )

    setForm(p => ({ ...p, panjangKms: row?.kms != null ? String(row.kms) : '' }))
  }, [form.ulp, form.penyulang, form.zonaProteksi, form.section, asetRows])

  const handleSubmit = async () => {
    if (!isFormValid || submitting) return
    setSubmitting(true)
    setProgress('Membuat row...')

    try {
<<<<<<< HEAD
      // 1) create row dulu
      const createRes = await postToGAS({ type: 'pemeliharaan_create', ...form })
      if (createRes?.status !== 'success' || !createRes?.row) {
        throw new Error(createRes?.message || 'Gagal create row')
      }
      const row = Number(createRes.row)

      // 2) upload foto satu-satu
      const tasks: Array<{ slot: string; file: File }> = []
      if (fotoSebelum[0]) tasks.push({ slot: 'sebelum1', file: fotoSebelum[0] })
      if (fotoSebelum[1]) tasks.push({ slot: 'sebelum2', file: fotoSebelum[1] })
      if (fotoProses[0]) tasks.push({ slot: 'proses', file: fotoProses[0] })
      if (fotoSesudah[0]) tasks.push({ slot: 'sesudah1', file: fotoSesudah[0] })
      if (fotoSesudah[1]) tasks.push({ slot: 'sesudah2', file: fotoSesudah[1] })

      for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i]
        setProgress(`Upload foto ${i + 1}/${tasks.length} (${t.slot})...`)
        const b64 = await fileToBase64(t.file)
        const upRes = await postToGAS({ type: 'pemeliharaan_upload', row, slot: t.slot, file: b64 })
        if (upRes?.status !== 'success') {
          throw new Error(upRes?.message || `Gagal upload ${t.slot}`)
        }
=======
      const payload = {
        type: 'pemeliharaan',
        ...form,
        fotoSebelum: await Promise.all((fotoSebelum || []).slice(0, 2).map(fileToBase64)),
        fotoProses: await Promise.all((fotoProses || []).slice(0, 1).map(fileToBase64)),
        fotoSesudah: await Promise.all((fotoSesudah || []).slice(0, 2).map(fileToBase64)),
>>>>>>> 97d8d466e1e4d2410e6fc725e89bef09a4963156
      }

      setProgress('')
      alert('BERHASIL! Row masuk + foto masuk Drive + link muncul di kolom S-W.')

<<<<<<< HEAD
      // reset
=======
      const json = await res.json().catch(() => null)
      if (!res.ok || json?.status !== 'success') {
        alert(`Gagal: ${json?.message || 'Unknown error'}`)
        return
      }

      alert('Berhasil dikirim')

>>>>>>> 97d8d466e1e4d2410e6fc725e89bef09a4963156
      setForm(p => ({
        ...p,
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
      }))
      setFotoSebelum([])
      setFotoProses([])
      setFotoSesudah([])
      setShowMap(false)
    } catch (e: any) {
      setProgress('')
      alert(`Gagal: ${e?.message || String(e)}\nCek log: ${API_URL}?type=logs`)
    } finally {
      setSubmitting(false)
    }
  }

<<<<<<< HEAD
=======
  useEffect(() => {
    fetch(API_URL)
      .then(r => r.json())
      .then(res => {
        setAsetRows(Array.isArray(res) ? res : [])
      })
      .catch(() => setAsetRows([]))
  }, [])

  useEffect(() => {
    if (!form.ulp || !form.penyulang || !form.zonaProteksi || !form.section) {
      setForm(p => ({ ...p, panjangKms: '' }))
      return
    }

    const row = asetRows.find(
      r =>
        String(r.ulp).trim() === form.ulp.trim() &&
        String(r.penyulang).trim() === form.penyulang.trim() &&
        String(r.zona).trim() === form.zonaProteksi.trim() &&
        String(r.section).trim() === form.section.trim()
    )

    if (row?.kms !== undefined && row?.kms !== null) {
      setForm(p => ({ ...p, panjangKms: String(row.kms) }))
    } else {
      setForm(p => ({ ...p, panjangKms: '' }))
    }
  }, [form.ulp, form.penyulang, form.zonaProteksi, form.section, asetRows])

>>>>>>> 97d8d466e1e4d2410e6fc725e89bef09a4963156
  return (
    <div className="h-screen overflow-hidden font-poppins flex flex-col">
      <div className="fixed inset-0 -z-10">
        <Image src={bg} alt="Background" fill className="object-cover" priority />
      </div>
      <div className="fixed inset-0 -z-10 bg-gradient-to-t from-[#165F67]/70 via-[#67C2E9]/30 to-transparent backdrop-blur-sm" />

      <div className="px-4 pt-3">
        <div className="bg-white rounded-full shadow px-6 py-2 flex items-center gap-3">
          <button onClick={() => router.push('/menu')}>
            <IoArrowBack size={22} />
          </button>
          <Image src={plnKecil} alt="pln" width={34} />
          <h1 className="font-medium">Pemeliharaan JTM Form</h1>
        </div>
      </div>

      <main className="flex-1 flex justify-center items-start px-0 pt-4 md:p-4 overflow-hidden">
        <div className="bg-white shadow-xl w-full flex flex-col h-full overflow-hidden rounded-t-[28px] rounded-b-none px-5 py-6 md:h-[82vh] md:rounded-3xl md:p-10 md:max-w-[1200px]">
          <div className="flex-1 overflow-y-auto pr-4">
<<<<<<< HEAD
            {!!progress && (
              <div className="mb-4 text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2">
                {progress}
              </div>
            )}

=======
>>>>>>> 97d8d466e1e4d2410e6fc725e89bef09a4963156
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
              <div className="flex flex-col gap-6">
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
                  searchable
                  onSave={v => handleChange('section', v)}
                  onClear={() => handleChange('section', '')}
                />

                <NumberStepper label="Panjang Km/s" value={form.panjangKms} onChange={v => handleChange('panjangKms', v)} />

                <PopupSelect
                  label="Mengapa JTM dipelihara?"
                  value={form.alasan}
                  options={MENGAPAJTMDIPELIHARA_LIST}
                  searchable
                  onSave={v => handleChange('alasan', v)}
                  onClear={() => handleChange('alasan', '')}
                />
              </div>

              <div className="flex flex-col gap-6">
                <PopupSelect
                  label="Apa yang dilakukan?"
                  value={form.pemeliharaan}
                  options={APAYGDILAKUKAN_LIST}
                  searchable
                  onSave={v => handleChange('pemeliharaan', v)}
                  onClear={() => handleChange('pemeliharaan', '')}
                />

                <Input
                  label="Tanggal Pemeliharaan"
                  type="date"
                  value={form.tanggalPemeliharaan}
                  onChange={e => handleChange('tanggalPemeliharaan', e.target.value)}
                />

                <PopupSelect
                  label="Dieksekusi oleh?"
                  value={form.dieksekusiOleh}
                  options={DIEKSEKUSI_LIST}
                  searchable
                  onSave={v => handleChange('dieksekusiOleh', v)}
                  onClear={() => handleChange('dieksekusiOleh', '')}
                />

                <NumberStepper label="Jumlah item material" value={form.jumlahItemMaterial} onChange={v => handleChange('jumlahItemMaterial', v)} />
                <NumberStepper label="Nilai Tahanan Isolasi Sesudah" value={form.NilaiTahananIsolasiSesudah} onChange={v => handleChange('NilaiTahananIsolasiSesudah', v)} />
                <NumberStepper label="Nilai Pentanahan Setelah Perbaikan" value={form.nilaiPertanahan} onChange={v => handleChange('nilaiPertanahan', v)} />

<<<<<<< HEAD
=======
                <NumberStepper
                  label="Nilai Tahanan Isolasi Sesudah"
                  value={form.NilaiTahananIsolasiSesudah}
                  onChange={v => handleChange('NilaiTahananIsolasiSesudah', v)}
                />

                <NumberStepper
                  label="Nilai Pentanahan Setelah Perbaikan"
                  value={form.nilaiPertanahan}
                  onChange={v => handleChange('nilaiPertanahan', v)}
                />

>>>>>>> 97d8d466e1e4d2410e6fc725e89bef09a4963156
                <Input label="Keterangan" value={form.keterangan} onChange={e => handleChange('keterangan', e.target.value)} />
              </div>
            </div>

            <div className="mt-10 w-full">
              <label className="text-sm font-semibold">
                Koordinat <span className="text-red-500">*</span>
              </label>

              <div className="mt-2 relative">
                <input
                  value={form.koordinat}
                  onChange={e => handleChange('koordinat', e.target.value)}
                  className="w-full py-3 pl-5 pr-12 border-2 border-[#2FA6DE] rounded-full"
                  placeholder="Klik ikon map untuk memilih lokasi"
                />

                <button
                  type="button"
                  onClick={() => setShowMap(prev => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-dark"
                >
                  <IoLocationSharp size={20} />
                </button>
              </div>

              {showMap && (
                <div className="mt-4 w-full rounded-xl border border-slate-300 bg-white" style={{ height: 380 }}>
                  <div className="w-full h-full">
                    <MapPicker koordinat={form.koordinat} onChange={(v: string) => handleChange('koordinat', v)} />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
              <MultiUploadPreview label="Foto Sebelum (maks 2)" files={fotoSebelum} setFiles={setFotoSebelum} />
              <MultiUploadPreview label="Foto Proses (maks 1)" files={fotoProses} setFiles={setFotoProses} />
              <MultiUploadPreview label="Foto Sesudah (maks 2)" files={fotoSesudah} setFiles={setFotoSesudah} />
            </div>

            <div className="flex gap-4 mt-12 justify-center">
              <button
                type="button"
                onClick={() => router.push('/menu')}
                className="px-12 py-3 bg-red-500 text-white rounded-full"
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

        <button type="button" onClick={() => onChange(String(num + 1))} className="w-12 h-12 border rounded-full text-xl">
          +
        </button>
      </div>
    </div>
  )
}

type MultiUploadPreviewProps = {
  label: string
  files: File[]
  setFiles: (f: File[]) => void
}

function MultiUploadPreview({ label, files, setFiles }: MultiUploadPreviewProps) {
  const [open, setOpen] = useState<number | null>(null)
  const previews = useMemo(() => files.map(f => URL.createObjectURL(f)), [files])

  useEffect(() => {
    return () => {
      previews.forEach(u => URL.revokeObjectURL(u))
    }
  }, [previews])

  return (
    <>
      <div>
        <label className="text-sm font-semibold">{label}</label>

        <div className="relative mt-2 h-[220px] border-2 border-dashed border-[#2FA6DE] rounded-2xl flex flex-wrap items-center justify-center gap-2 p-2">
          {previews.map((src, i) => (
            <div key={i} className="relative h-20 w-20">
              <img
                src={src}
                className="h-full w-full object-cover rounded cursor-pointer"
                onClick={() => setOpen(i)}
                alt={`preview-${i}`}
              />

              <button
                type="button"
                onClick={() => setFiles(files.filter((_, x) => x !== i))}
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
<<<<<<< HEAD
        <div
          onClick={() => setOpen(null)}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
        >
=======
        <div onClick={() => setOpen(null)} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
>>>>>>> 97d8d466e1e4d2410e6fc725e89bef09a4963156
          <img src={previews[open]} className="max-w-[90vw] max-h-[90vh] rounded-xl" alt="preview-large" />
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
        <div
          className={`mt-2 px-5 py-3 rounded-full flex items-center justify-between border-2 transition
          ${value ? 'border-[#2FA6DE] bg-[#2FA6DE]/5' : 'border-[#2FA6DE]'}
          hover:bg-[#2FA6DE]/5`}
        >
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
                onChange={e => setSearch(e.target.value)}
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
          ${isDateEmpty ? 'text-gray-400' : 'text-black'}`}
      />
    </div>
  )
}