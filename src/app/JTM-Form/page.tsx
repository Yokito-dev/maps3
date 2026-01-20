'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { IoArrowBack, IoChevronDown } from 'react-icons/io5'
import bg from '@/app/assets/plnup3/bgnogradient.png'
import plnKecil from '@/app/assets/plnup3/plnkecil.svg'
import { useRouter } from 'next/navigation';

const API_URL = 'https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLji40CSU0p0TKSoXkVVA6Sgrk9IRFpjjbY1tZBc9yO5b59mn8sxoAUBX1-ScQdInPEG6A_Qa6U7qGvNC9y8xU-_5zilJ4ZRMlMC6tO7xAmWfpNSx8-wSVeBH7v1lrGSWe21Yq7wIeVHqZniWXCqkwfH9a-srjZIZltWej96O3aAm8RI9oio0l0ehRgsAXTITQAI-5Fuvr2gYs_Q5WB3eLjMaMStdFcWglXaiqoiW8zeQylGDx0xd2UPJdAz62p6SgYtDNNLB3jlW-3Hdr56RytVwDzH8mZJJhw0S11i&lib=M8srHN6l5HstLsVN5sHMzfliEca9t7RmR'

type ProgressKey = "on" | "close"

type SheetRow = {
    up3: string
    ulp: string
    penyulang: string
    zona: string
    section: string
    kms: number
    progress: string
    role: string
}

export default function Page() {
    const router = useRouter();
    const [sheetData, setSheetData] = useState<SheetRow[]>([])
    const [loading, setLoading] = useState(true)
    const progressOptions: {
        key: ProgressKey
        label: string
        color: "green" | "blue"
    }[] = [
            { key: "on", label: "On Schedule", color: "green" },
            { key: "close", label: "Close Inspeksi", color: "blue" },
        ]


    const [form, setForm] = useState({
        up3: 'UP3 MAKASSAR SELATAN',
        ulp: '',
        penyulang: '',
        zona: '',
        section: '',
        panjangAset: '0',
        kms: '0',
        scheduleDate: '',
        tujuan: '',
        keterangan: '',
    })

    const [progress, setProgress] = useState<'on' | 'close' | null>(null)

    const handleChange = (key: keyof typeof form, val: string) => {
        setForm(p => ({ ...p, [key]: val }))
    }

    // ================= FETCH DATA =================
    useEffect(() => {
        fetch(API_URL)
            .then(res => res.json())
            .then(data => {
                setSheetData(data)
                setLoading(false)
            })
            .catch(err => {
                console.error('Gagal ambil data sheet', err)
                setLoading(false)
            })
    }, [])

    // ================= BENTUK DATA DINAMIS =================

    const ULP_LIST = useMemo(() => {
        return Array.from(new Set(sheetData.map(d => d.ulp).filter(Boolean)))
    }, [sheetData])

    const PENYULANG_BY_ULP = useMemo(() => {
        const map: Record<string, string[]> = {}
        sheetData.forEach(d => {
            if (!map[d.ulp]) map[d.ulp] = []
            if (!map[d.ulp].includes(d.penyulang)) {
                map[d.ulp].push(d.penyulang)
            }
        })
        return map
    }, [sheetData])

    const ZONA_BY_PENYULANG = useMemo(() => {
        const map: Record<string, string[]> = {}
        sheetData.forEach(d => {
            if (!map[d.penyulang]) map[d.penyulang] = []
            if (!map[d.penyulang].includes(d.zona)) {
                map[d.penyulang].push(d.zona)
            }
        })
        return map
    }, [sheetData])

    const SECTION_BY_ZONA = useMemo(() => {
        const map: Record<string, string[]> = {}
        sheetData.forEach(d => {
            if (!map[d.zona]) map[d.zona] = []
            if (!map[d.zona].includes(d.section)) {
                map[d.zona].push(d.section)
            }
        })
        return map
    }, [sheetData])

    // ================= AUTO ISI KMS & PANJANG ASET =================

    useEffect(() => {
        if (form.section) {
            const row = sheetData.find(
                d =>
                    d.ulp === form.ulp &&
                    d.penyulang === form.penyulang &&
                    d.zona === form.zona &&
                    d.section === form.section
            )

            if (row) {
                setForm(p => ({
                    ...p,
                    panjangAset: row.kms.toString(), // ⬅️ convert ke string
                    kms: row.kms.toString(),         // ⬅️ convert ke string
                }))
            }

        }
    }, [form.section, form.zona, form.penyulang, form.ulp, sheetData])

    const changeKms = (n: number) => {
        setForm(p => ({
            ...p,
            kms: Math.max(0, Number(p.kms) + n).toString(),
        }))
    }

    const isValid =
        form.ulp &&
        form.penyulang &&
        form.zona &&
        form.section &&
        form.scheduleDate &&
        form.tujuan &&
        form.keterangan &&
        progress !== null



    if (loading) {
        return <div className="p-10">Loading data dari Spreadsheet...</div>
    }

    return (
        <div className="h-screen overflow-hidden font-poppins">

            {/* BACKGROUND */}
            <div className="fixed inset-0 -z-10">
                <Image src={bg} alt="bg" fill className="object-cover" />
            </div>

            {/* HEADER */}
            <div className="px-4 pt-3">
                <div className="bg-white rounded-full shadow-lg px-6 py-2 flex items-center gap-3">
                    <button onClick={() => router.push('/menu')} className="w-11 h-11 rounded-full hover:bg-gray-200 flex items-center justify-center">
                        <IoArrowBack size={24} />
                    </button>
                    <Image src={plnKecil} alt="pln" width={36} height={36} />
                    <h1 className="font-medium">Schedule JTM Form</h1>
                </div>
            </div>

            {/* CONTENT */}
            <main className="h-full flex justify-center items-start p-4">
                <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-[1200px] h-[82vh] overflow-y-auto">


                    {/* GRID UTAMA */}
                    <div className="grid grid-cols-2 gap-x-10 gap-y-8">

                        {/* ===== ROW 1 ===== */}
                        <Input label="UP3" value={form.up3} readOnly />

                        <div>
                            <label className="text-sm font-semibold">
                                KMS Inspeksi <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center gap-3 mt-2">
                                <input
                                    value={form.kms}
                                    readOnly
                                    className="flex-1 py-3 px-5 border-2 border-[#2FA6DE] rounded-full"/>
                                <button onClick={() => changeKms(-1)} className="w-12 h-12 border rounded-full text-xl">−</button>
                                <button onClick={() => changeKms(1)} className="w-12 h-12 border rounded-full text-xl">+</button>
                            </div>
                        </div>

                        {/* ===== ROW 2 ===== */}
                        <PopupSelect
                            label="ULP"
                            value={form.ulp}
                            options={ULP_LIST}
                            onSave={v => {
                                handleChange("ulp", v)
                                handleChange("penyulang", "")
                                handleChange("zona", "")
                                handleChange("section", "")
                            }}
                            onClear={() => handleChange("ulp", "")}/>

                        <Input
                            label="Schedule Date"
                            type="date"
                            value={form.scheduleDate}
                            onChange={e => handleChange("scheduleDate", e.target.value)}/>

                        {/* ===== ROW 3 ===== */}
                        <PopupSelect
                            label="Penyulang"
                            value={form.penyulang}
                            options={PENYULANG_BY_ULP[form.ulp] || []}
                            onSave={v => {
                                handleChange("penyulang", v)
                                handleChange("zona", "")
                                handleChange("section", "")
                            }}
                            onClear={() => handleChange("penyulang", "")}/>

                        <PopupSelect
                            label="Tujuan Penjadwalan"
                            value={form.tujuan}
                            options={[
                                "Untuk Inspeksi Preventif",
                                "Untuk Pemeliharaan Korektif",
                                "Untuk PTT",
                                "Untuk Inspeksi Drone",
                            ]}
                            onSave={v => handleChange("tujuan", v)}
                            onClear={() => handleChange("tujuan", "")}/>

                        {/* ===== ROW 4 ===== */}
                        <div
                            className={`transition ${!form.penyulang ? 'opacity-40 pointer-events-none' : ''
                                }`}>
                            <PopupSelect
                                label="Zona Proteksi"
                                value={form.zona}
                                options={ZONA_BY_PENYULANG[form.penyulang] || []}
                                disabled={!form.penyulang}
                                onSave={v => {
                                    handleChange("zona", v)
                                    handleChange("section", "")
                                }}
                                onClear={() => handleChange("zona", "")}/>
                        </div>


                        <PopupSelect
                            label="Keterangan Jadwal"
                            value={form.keterangan}
                            options={[
                                "Schedule Untuk Pegawai",
                                "Schedule Untuk Inspektor",
                                "Schedule Untuk Tim ROW",
                                "Schedule Untuk Tim Yantek",
                                "Schedule Untuk Tim KHS",
                            ]}
                            onSave={v => handleChange("keterangan", v)}
                            onClear={() => handleChange("keterangan", "")}/>

                        {/* ===== ROW 5 ===== */}
                        <div
                            className={`transition ${!form.zona ? 'opacity-40 pointer-events-none' : ''
                                }`}>
                            <PopupSelect
                                label="Section"
                                value={form.section}
                                options={SECTION_BY_ZONA[form.zona] || []}
                                disabled={!form.zona}
                                onSave={v => handleChange("section", v)}
                                onClear={() => handleChange("section", "")}/>

                        </div>

                        <div>
                            <label className="text-sm font-semibold">
                                Progress <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-6 mt-3">
                                {progressOptions.map(item => (
                                    <div
                                        key={item.key}
                                        onClick={() => setProgress(item.key)}
                                        className="flex items-center gap-3 cursor-pointer">

                                        <div
                                            className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${progress === item.key
                                                ? item.color === "green"
                                                    ? "bg-green-500 border-green-500"
                                                    : "bg-blue-500 border-blue-500"
                                                : "border-gray-400"
                                                }`}>
                                            {progress === item.key && <span className="text-white text-lg">✓</span>}
                                        </div>
                                        <span className="font-medium">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ===== ROW 6 ===== */}
                        <Input label="Panjang Aset" value={form.panjangAset} readOnly />

                        {/* ACTION — SEJAJAR INPUT */}
                        <div className="flex gap-4 items-end">
                            <button className="px-10 py-3 bg-red-500 text-white rounded-full">
                                Cancel
                            </button>
                            <button
                                disabled={!isValid}
                                className={`px-10 py-3 rounded-full text-white ${isValid ? "bg-[#2FA6DE]" : "bg-gray-400 cursor-not-allowed"}`}>
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

function PopupSelect({
    label,
    value,
    options,
    onSave,
    onClear,
    disabled = false,
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

    const filtered = options.filter(o =>
        o.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <>
            {/* FIELD */}
            <div
                onClick={() => {
                    if (!disabled) setOpen(true)
                }}
                className={`
        transition
        ${disabled
                        ? 'opacity-40 blur-[0.5px] cursor-not-allowed'
                        : 'cursor-pointer'}
    `}>

                <label className="text-sm font-semibold">
                    {label} <span className="text-red-500">*</span>
                </label>
                <div className="mt-2 px-5 py-3 border-2 border-[#2FA6DE] rounded-full flex items-center justify-between">
                    <span className={value ? '' : 'text-gray-400'}>
                        {value || `Pilih ${label}`}
                    </span>
                    <IoChevronDown />
                </div>
            </div>

            {/* POPUP */}
            {open && (
                <div
                    className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
                    onClick={() => setOpen(false)}   // ⬅️ klik luar = close
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        className=" bg-white  p-6  rounded-xl  w-[700px]  max-h-[75vh]  flex flex-col">

                        <h2 className="font-bold text-lg mb-3">{label}</h2>

                        {/* SEARCH */}
                        <input
                            placeholder="Cari..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="mb-3 px-4 py-2 border rounded-lg"/>

                        {/* LIST */}
                        <div className="overflow-y-auto flex-1">
                            {filtered.map(o => (
                                <div
                                    key={o}
                                    onClick={() => {
                                        onSave(o)
                                        setOpen(false)     // ⬅️ auto close saat pilih
                                        setSearch('')
                                    }}
                                    className={`py-2 px-2 cursor-pointer hover:bg-gray-100 rounded ${value === o ? 'font-bold bg-gray-100' : ''
                                        }`}>
                                    {o}
                                </div>
                            ))}

                            {filtered.length === 0 && (
                                <div className="text-gray-400 text-sm py-4 text-center">
                                    Tidak ada data
                                </div>
                            )}
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


function Input({
    label,
    value,
    type = 'text',
    onChange,
    readOnly = false,
}: {
    label: string
    value: string
    type?: string
    readOnly?: boolean
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
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
                className={`mt-2 w-full py-3 px-5 border-2 border-[#2FA6DE] rounded-full ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}/>
        </div>
    )
}
