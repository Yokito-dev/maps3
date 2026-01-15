'use client'
import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { FaArrowLeftLong, FaLocationDot } from "react-icons/fa6"
import { IoCheckmarkSharp } from "react-icons/io5"

import bg from '@/app/assets/plnup3/bgnogradient.png'
import logo from '@/app/assets/plnup3/plnkecil.png'

/* ================= PAGE ================= */
export default function Page() {

  const [garduList, setGarduList] = useState<string[]>(['Gardu A', 'Gardu B'])
  const [up3List, setUp3List] = useState<string[]>(['UP3 A', 'UP3 B'])
  const [ulpList, setUlpList] = useState<string[]>(['PANAKUKKANG', 'MATTOANGING'])
  const [penyulangList, setPenyulangList] = useState<string[]>(['Penyulang X', 'Penyulang Y'])

  const [form, setForm] = useState({
    namaGardu: '',
    up3: '',
    ulp: '',
    scheduleDate: '',
    penyulang: '',
    zona: '',
    longlat: '',
    kapasitas: '',
    fasa: '',
  })

  const [section, setSection] = useState<'X' | 'Y' | null>(null)
  const [progress, setProgress] = useState<'open' | 'close' | null>(null)

  const handleChange = (name: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [name]: value }))

    if (name === 'penyulang') {
      setForm(prev => ({ ...prev, zona: '' }))
      setSection(null)
    }
  }

  const isFormValid =
    Object.values(form).every(v => v !== '') &&
    section !== null &&
    progress !== null

  return (
    <div className="min-h-screen font-poppins">

      {/* BACKGROUND */}
      <div className="fixed inset-0 -z-10">
        <Image src={bg} alt="Background" fill className="object-cover" priority />
      </div>
      <div className="fixed inset-0 -z-10 bg-gradient-to-t from-[#165F67]/70 via-[#67C2E9]/30 to-transparent backdrop-blur-sm" />

      {/* HEADER */}
      <header className="fixed top-0 left-0 z-50 w-full pt-5 flex justify-center">
        <div className="flex items-center gap-3 bg-white px-10 py-3 rounded-3xl shadow-md w-full md:w-[95%]">
          <Link href="/dashboard">
            <FaArrowLeftLong />
          </Link>
          <Image src={logo} alt="Logo" width={15} height={10} />
          <h1 className="font-medium">Schedule GD Form</h1>
        </div>
      </header>

      {/* CONTENT */}
      <main className="pt-32 px-6 pb-10 max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl p-8 grid md:grid-cols-2 gap-8">

          {/* LEFT */}
          <div className="space-y-5">

            <PopupSelect
              label="Nama Gardu"
              value={form.namaGardu}
              options={garduList}
              onSave={(v: string) => handleChange('namaGardu', v)}
              onAdd={(v: string) => setGarduList(p => [...p, v])}
              onClear={() => handleChange('namaGardu', '')}
            />

            <PopupSelect
              label="UP3"
              value={form.up3}
              options={up3List}
              onSave={(v: string) => handleChange('up3', v)}
              onAdd={(v: string) => setUp3List(p => [...p, v])}
              onClear={() => handleChange('up3', '')}
            />

            <PopupSelect
              label="ULP"
              value={form.ulp}
              options={ulpList}
              onSave={(v: string) => handleChange('ulp', v)}
              onAdd={(v: string) => setUlpList(p => [...p, v])}
              onClear={() => handleChange('ulp', '')}
            />

            <Input
              label="Schedule Date"
              type="date"
              value={form.scheduleDate}
              onChange={(e) => handleChange('scheduleDate', e.target.value)}
            />

            <PopupSelect
              label="Penyulang"
              value={form.penyulang}
              options={penyulangList}
              onSave={(v: string) => handleChange('penyulang', v)}
              onAdd={(v: string) => setPenyulangList(p => [...p, v])}
              onClear={() => handleChange('penyulang', '')}
            />
          </div>

          {/* RIGHT */}
          <div className="space-y-5">

            {form.penyulang && (
              <PopupSelect
                label="Section"
                value={form.zona}
                options={['X', 'Y']}
                onSave={(v: string) => handleChange('zona', v)}
                onClear={() => handleChange('zona', '')}
              />
            )}

            {form.zona && (
              <div>
                <label className="text-sm font-semibold">
                  Zona Proteksi <span className="text-red-500">*</span>
                </label>

                <div className="flex gap-4 mt-3">
                  {['X', 'Y'].map(z => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setSection(z as 'X' | 'Y')}
                      className={`px-8 py-3 rounded-full border
                        ${section === z
                          ? 'bg-[#2FA6DE] text-white'
                          : 'border-[#2FA6DE] text-[#2FA6DE]'}`}
                    >
                      Zona {z}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Input
              label="Longlat"
              value={form.longlat}
              icon={<FaLocationDot />}
              onChange={(e) => handleChange('longlat', e.target.value)}
            />

            <Input
              label="Kapasitas"
              value={form.kapasitas}
              onChange={(e) => handleChange('kapasitas', e.target.value)}
            />

            <PopupSelect
              label="FASA"
              value={form.fasa}
              options={['R', 'S', 'T']}
              onSave={(v: string) => handleChange('fasa', v)}
              onClear={() => handleChange('fasa', '')}
            />

            {/* PROGRESS */}
            <div>
              <label className="text-sm font-semibold">
                Progress GD <span className="text-red-500">*</span>
              </label>

              <div className="flex gap-4 mt-3 items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center
                  ${progress === 'open' ? 'bg-green-500' :
                    progress === 'close' ? 'bg-red-500' : 'bg-gray-300'}`}>
                  <IoCheckmarkSharp className="text-white text-2xl" />
                </div>

                <button
                  onClick={() => setProgress('open')}
                  className={`px-6 py-3 rounded-full
                    ${progress === 'open'
                      ? 'bg-[#2FA6DE] text-white'
                      : 'border border-[#2FA6DE]'}`}
                >
                  Open Inspeksi
                </button>

                <button
                  onClick={() => setProgress('close')}
                  className={`px-6 py-3 rounded-full
                    ${progress === 'close'
                      ? 'bg-[#2FA6DE] text-white'
                      : 'border border-[#2FA6DE]'}`}
                >
                  Close Inspeksi
                </button>
              </div>
            </div>
          </div>

          {/* ACTION */}
          <div className="md:col-span-2 flex justify-end gap-4">
            <button className="px-10 py-3 rounded-full bg-red-500 text-white">
              Cancel
            </button>

            <button
              disabled={!isFormValid}
              className={`px-10 py-3 rounded-full text-white
                ${isFormValid ? 'bg-[#2FA6DE]' : 'bg-gray-400 cursor-not-allowed'}`}
            >
              Save
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

/* ================= POPUP SELECT ================= */
interface PopupSelectProps {
  label: string
  value: string
  options: string[]
  onSave: (value: string) => void
  onAdd?: (value: string) => void
  onClear: () => void
}

function PopupSelect({
  label,
  value,
  options,
  onSave,
  onAdd,
  onClear,
}: PopupSelectProps) {

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [temp, setTemp] = useState(value)

  const filtered = options.filter(o =>
    o.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <>
      <div>
        <label className="text-sm font-semibold">
          {label} <span className="text-red-500">*</span>
        </label>

        <div
          onClick={() => { setTemp(value); setQuery(''); setOpen(true) }}
          className="w-full mt-2 px-5 py-3 rounded-full border-2 border-[#2FA6DE] cursor-pointer"
        >
          <span className={value ? '' : 'text-gray-400'}>
            {value || `Pilih ${label}`}
          </span>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-gradient-to-t from-[#165F67]/70 via-[#67C2E9]/30 to-transparent flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-[420px] shadow-md">

            <h2 className="font-semibold mb-3">{label}</h2>

            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cari / tambah"
              className="w-full px-4 py-2 border rounded mb-3"
            />

            <div className="max-h-48 overflow-y-auto mb-3">
              {filtered.map(opt => (
                <div
                  key={opt}
                  onClick={() => setTemp(opt)}
                  className={`px-4 py-2 rounded cursor-pointer
                    ${temp === opt ? 'bg-[#2FA6DE] text-white' : 'hover:bg-gray-100'}`}
                >
                  {opt}
                </div>
              ))}
            </div>

            {query && !options.includes(query) && onAdd && (
              <button
                onClick={() => { onAdd(query); setTemp(query) }}
                className="text-[#2FA6DE] mb-4"
              >
                + Tambah "{query}"
              </button>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { onClear(); setOpen(false) }}
                className="text-red-500"
              >
                Clear
              </button>

              <button
                onClick={() => { onSave(temp); setOpen(false) }}
                className="px-6 py-2 bg-[#2FA6DE] text-white rounded-full"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}

/* ================= INPUT ================= */
interface InputProps {
  label: string
  value: string
  type?: string
  icon?: React.ReactNode
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

function Input({ label, value, type = 'text', icon, onChange }: InputProps) {
  return (
    <div>
      <label className="text-sm font-semibold">
        {label} <span className="text-red-500">*</span>
      </label>

      <div className="relative mt-2">
        <input
          type={type}
          value={value}
          onChange={onChange}
          className={`w-full py-3 rounded-full border-2 border-[#2FA6DE]
            ${icon ? 'pl-5 pr-12' : 'px-5'}`}
        />
        {icon && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
            {icon}
          </span>
        )}
      </div>
    </div>
  )
}