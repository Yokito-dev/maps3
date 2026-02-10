'use client'

import dynamic from 'next/dynamic'
import { useState, ChangeEvent } from 'react'
import Image from 'next/image'
import { IoArrowBack, IoClose } from 'react-icons/io5'
import { useRouter } from 'next/navigation'

import bg from '@/app/assets/plnup3/bgnogradient.png'
import plnKecil from '@/app/assets/plnup3/plnkecil.svg'

const Mapsi = dynamic(() => import('../components/mapsi'), { ssr: false })

export default function Page() {
  const router = useRouter()

  const [form, setForm] = useState({
    namaTemuan: '',
    keterangan: '',
    koordinatList: [''],
    panjangKms: '',
  })

  const koordinatString = form.koordinatList
    .map(v => v.trim())
    .filter(v => v !== '')
    .join(';')

  const [fotoTemuan, setFotoTemuan] = useState<File[]>([])

  const isValid =
    form.namaTemuan.trim() !== '' &&
    form.keterangan.trim() !== '' &&
    form.koordinatList.some(v => v.trim() !== '') &&
    fotoTemuan.length > 0

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
          <button onClick={() => router.back()}>
            <IoArrowBack size={22} />
          </button>
          <Image src={plnKecil} alt="pln" width={34} />
          <h1 className="font-medium">Tambahkan Temuan</h1>
        </div>
      </div>

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">

              {/* KIRI */}
              <div className="flex flex-col gap-6">

                <Input
                  label="Nama Temuan"
                  value={form.namaTemuan}
                  onChange={e =>
                    setForm(p => ({ ...p, namaTemuan: e.target.value }))
                  }
                />

                {/* KOORDINAT */}
                <div>
                  <label className="text-sm font-semibold">
                    Koordinat <span className="text-red-500">*</span>
                  </label>

                  <div className="mt-2 flex flex-col gap-2">

                    {form.koordinatList.map((val, i) => (
                      <div key={i} className="relative">
                        <input
                          value={val}
                          onChange={e => {
                            const copy = [...form.koordinatList]
                            copy[i] = e.target.value
                            setForm(p => ({ ...p, koordinatList: copy }))
                          }}
                          className="w-full py-3 pl-5 pr-12 border-2 border-[#2FA6DE] rounded-full"
                          placeholder={`Koordinat ${i + 1} (lat,lng)`}
                        />

                        {form.koordinatList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const copy = form.koordinatList.filter((_, x) => x !== i)
                              setForm(p => ({ ...p, koordinatList: copy }))
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500"
                          >
                            <IoClose size={18} />
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() =>
                        setForm(p => ({
                          ...p,
                          koordinatList: [...p.koordinatList, ''],
                        }))
                      }
                      className="text-sm text-sky-600 font-medium self-start"
                    >
                      + Tambah koordinat
                    </button>

                    {/* lokasi sekarang */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!navigator.geolocation) {
                          alert('Browser tidak mendukung GPS')
                          return
                        }

                        navigator.geolocation.getCurrentPosition(pos => {
                          const lat = pos.coords.latitude
                          const lng = pos.coords.longitude

                          setForm(p => ({
                            ...p,
                            koordinatList: [
                              ...p.koordinatList.filter(v => v.trim() !== ''),
                              `${lat},${lng}`,
                            ],
                          }))
                        })
                      }}
                      className="text-sm text-emerald-600 font-medium self-start"
                    >
                      📍 Gunakan lokasi saya
                    </button>

                  </div>

                  {form.koordinatList.some(v => v.trim() !== '') && (
                    <div
                      className="mt-4 w-full rounded-xl border border-slate-300 bg-white"
                      style={{ height: 380 }}
                    >
                      <Mapsi
                        koordinat={koordinatString}
                        onDistanceChange={(km) =>
                          setForm(p => ({
                            ...p,
                            panjangKms: km.toString(),
                          }))
                        }
                      />
                    </div>
                  )}
                </div>

                {/* PANJANG KMS */}
                <div>
                  <label className="text-sm font-semibold">
                    Panjang KMS
                  </label>
                  <input
                    value={form.panjangKms}
                    readOnly
                    className="mt-2 w-full py-3 px-5 border-2 border-[#2FA6DE] rounded-full bg-slate-50"
                  />
                </div>

              </div>

              {/* KANAN */}
              <div className="flex flex-col gap-6">

                <div>
                  <label className="text-sm font-semibold">
                    Keterangan <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={form.keterangan}
                    onChange={e =>
                      setForm(p => ({ ...p, keterangan: e.target.value }))
                    }
                    rows={5}
                    className="mt-2 w-full py-3 px-5 border-2 border-[#2FA6DE] rounded-2xl resize-none"
                  />
                </div>

                <MultiUploadPreview
                  label="Foto Temuan"
                  files={fotoTemuan}
                  setFiles={setFotoTemuan}
                />

              </div>
            </div>

            <div className="flex gap-4 mt-12 justify-center">
              <button
                onClick={() => router.back()}
                className="px-12 py-3 bg-red-500 text-white rounded-full"
              >
                Cancel
              </button>

              <button
                disabled={!isValid}
                className={`px-12 py-3 rounded-full text-white
                  ${isValid ? 'bg-[#2FA6DE]' : 'bg-gray-400 cursor-not-allowed'}
                `}
              >
                Simpan
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}

/* INPUT */
function Input({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div>
      <label className="text-sm font-semibold">
        {label} <span className="text-red-500">*</span>
      </label>
      <input
        value={value}
        onChange={onChange}
        className="mt-2 w-full py-3 px-5 border-2 border-[#2FA6DE] rounded-full"
      />
    </div>
  )
}

/* MULTI UPLOAD */
function MultiUploadPreview({
  label,
  files,
  setFiles,
}: {
  label: string
  files: File[]
  setFiles: (f: File[]) => void
}) {
  const [open, setOpen] = useState<number | null>(null)
  const previews = files.map(f => URL.createObjectURL(f))

  return (
    <>
      <div>
        <label className="text-sm font-semibold">
          {label} <span className="text-red-500">*</span>
        </label>

        <div
          className="
            relative mt-2 min-h-[220px]
            border-2 border-dashed border-[#2FA6DE]
            rounded-2xl
            flex flex-wrap items-start gap-3 p-3
          "
        >

          {previews.map((src, i) => (
            <div
              key={i}
              className="relative h-28 w-36 rounded-xl overflow-hidden border cursor-pointer"
            >
              <img
                src={src}
                className="h-full w-full object-cover"
                onClick={() => setOpen(i)}
              />

              <button
                type="button"
                onClick={() =>
                  setFiles(files.filter((_, x) => x !== i))
                }
                className="
                  absolute top-1 right-1
                  bg-red-500 text-white
                  w-6 h-6 rounded-full
                  flex items-center justify-center
                "
              >
                <IoClose size={12} />
              </button>
            </div>
          ))}

          <label
            className="
              h-28 w-36
              border border-dashed
              rounded-xl
              flex items-center justify-center
              cursor-pointer text-gray-400
            "
          >
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
          className="
            fixed inset-0
            bg-black/70
            z-[9999]
            flex items-center justify-center p-4
          "
        >
          <img
            src={previews[open]}
            onClick={e => e.stopPropagation()}
            className="max-w-[95vw] max-h-[95vh] rounded-2xl object-contain"
          />
        </div>
      )}
    </>
  )
}
