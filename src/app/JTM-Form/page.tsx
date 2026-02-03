'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { IoArrowBack, IoChevronDown } from 'react-icons/io5'
import bg from '@/app/assets/plnup3/bgnogradient.png'
import plnKecil from '@/app/assets/plnup3/plnkecil.svg'
import { useRouter } from 'next/navigation';

const API_URL = "https://script.google.com/macros/s/AKfycbyCxXZWyPBCJsyuLZpeynkr6V5FGCsLZopQaUQTPRIMKA6vpXriueq26O1n-SrsK_ALfA/exec"

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
        color: "green" | "red"
    }[] = [
            { key: "on", label: "On Schedule", color: "green" },
            { key: "close", label: "Close Inspeksi", color: "red" },
        ]

    const INITIAL_FORM = {
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
    }


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
        fetch(API_URL + "?type=aset")
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
                    panjangAset: row.kms.toString(),
                    kms: row.kms.toString(),
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

    // ================= SUBMIT KE SCHEDULE JTM =================

    const formatDateID = (value: string) => {
        if (!value) return ""
        const [y, m, d] = value.split("-")
        return `${d}/${m}/${y}`
    }


    const handleSubmit = async () => {
        try {
            const isOn = progress === "on"

            const payload = {
                up3: form.up3,
                ulp: form.ulp,
                penyulang: form.penyulang,
                zona: form.zona,
                section: form.section,
                kms_aset: Number(form.panjangAset),
                kms_inspeksi: Number(form.kms),
                start_date: formatDateID(form.scheduleDate),
                tujuan_penjadwalan: form.tujuan,
                progress: isOn ? "On Schedule" : "Close Inspeksi",
                colour: isOn ? "Green" : "Blue",
                potensi: "",
                keterangan: form.keterangan || "",
                ket_drone: "",
            }

            const formBody = new URLSearchParams(payload as any).toString()

            const res = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: formBody,
            })

            const text = await res.text()
            console.log("RAW RESPONSE:", text)

            const result = JSON.parse(text)
            if (result.status !== "success") throw new Error("Gagal simpan")

            alert("✅ Data berhasil disimpan!")

            // 🔄 RESET FORM
            setForm(INITIAL_FORM)
            setProgress(null)

        } catch (err) {
            console.error(err)
            alert("❌ Gagal menyimpan data")
        }
    }

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
                    <h1 className="font-medium">Schedule JTM Form</h1>
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

                    {/* WRAPPER KHUSUS DESKTOP */}
                    <div className="flex-1 overflow-y-auto">

                        {/* ===== LOADING CONDITIONAL ===== */}
                        {loading ? (
                            <div className="flex h-full w-full items-center justify-center">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-10 h-10 border-4 border-[#2FA6DE] border-t-transparent rounded-full animate-spin" />
                                    <p className="text-gray-500 text-sm font-medium">
                                        Memuat data...
                                    </p>
                                </div>
                            </div>
                        ) : (

                            /* ===== FORM GRID ===== */
                            <div className="min-h-full md:flex md:items-center">
                                <div className="grid w-full grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">

                                    {/* KOLOM KIRI */}
                                    <div className="flex flex-col gap-6">
                                        <Input label="UP3" value={form.up3} readOnly />
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
                                            onClear={() => handleChange("ulp", "")}
                                            searchable={false}
                                        />
                                        <PopupSelect
                                            label="Penyulang"
                                            value={form.penyulang}
                                            options={PENYULANG_BY_ULP[form.ulp] || []}
                                            onSave={v => {
                                                handleChange("penyulang", v)
                                                handleChange("zona", "")
                                                handleChange("section", "")
                                            }}
                                            onClear={() => handleChange("penyulang", "")}
                                            searchable={false}
                                        />
                                        <PopupSelect
                                            label="Zona Proteksi"
                                            value={form.zona}
                                            options={ZONA_BY_PENYULANG[form.penyulang] || []}
                                            disabled={!form.penyulang}
                                            onSave={v => {
                                                handleChange("zona", v)
                                                handleChange("section", "")
                                            }}
                                            onClear={() => handleChange("zona", "")}
                                            searchable={false}
                                        />
                                        <PopupSelect
                                            label="Section"
                                            value={form.section}
                                            options={SECTION_BY_ZONA[form.zona] || []}
                                            disabled={!form.zona}
                                            onSave={v => handleChange("section", v)}
                                            onClear={() => handleChange("section", "")}
                                            searchable={true}
                                        />
                                        <Input label="Panjang Aset" value={form.panjangAset} readOnly />
                                    </div>

                                    {/* KOLOM KANAN */}
                                    <div className="flex flex-col gap-6">
                                        {/* KMS */}
                                        {/* KMS */}
                                        <div>
                                            <label className="text-sm font-semibold">
                                                KMS Inspeksi <span className="text-red-500">*</span>
                                            </label>

                                            <div className="flex items-center gap-3 mt-2">
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    value={form.kms}
                                                    onChange={e => {
                                                        const val = e.target.value.replace(/\D/g, '')
                                                        handleChange("kms", val)
                                                    }}
                                                    className="flex-1 py-3 px-5 border-2 border-[#2FA6DE] rounded-full"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => changeKms(-1)}
                                                    className="w-12 h-12 border rounded-full text-xl"
                                                >
                                                    −
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => changeKms(1)}
                                                    className="w-12 h-12 border rounded-full text-xl"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>

                                        {/* Schedule Date */}
                                        <div>
                                            <label className="text-sm font-semibold">
                                                Schedule Date <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                value={form.scheduleDate}
                                                onChange={e => handleChange("scheduleDate", e.target.value)}
                                                className={`mt-2 w-full py-3 px-5 border-2 border-[#2FA6DE] rounded-full ${form.scheduleDate ? "text-black" : "text-gray-400"}`}
                                            />
                                        </div>

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
                                            onClear={() => handleChange("tujuan", "")}
                                            searchable={false}
                                        />

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
                                            onClear={() => handleChange("keterangan", "")}
                                            searchable={false}
                                        />

                                        {/* Progress */}
                                        <div>
                                            <label className="text-sm font-semibold">
                                                Progress <span className="text-red-500">*</span>
                                            </label>
                                            <div className="flex gap-6 mt-3">
                                                {progressOptions.map(item => (
                                                    <div
                                                        key={item.key}
                                                        onClick={() => setProgress(item.key)}
                                                        className="flex items-center gap-3 cursor-pointer"
                                                    >
                                                        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${progress === item.key
                                                            ? item.color === "green"
                                                                ? "bg-green-500 border-green-500"
                                                                : "bg-blue-500 border-blue-500"
                                                            : "border-gray-400"
                                                            }`}
                                                        >
                                                            {progress === item.key && <span className="text-white text-lg">✓</span>}
                                                        </div>
                                                        <span className="font-medium">{item.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Action */}
                                        <div className="flex gap-4 mt-8 items-end">
                                            <button className="flex-1 py-3 bg-red-500 text-white rounded-full">
                                                Cancel
                                            </button>
                                            <button
                                                disabled={!isValid}
                                                onClick={handleSubmit}
                                                className={`flex-1 py-3 rounded-full text-white ${isValid ? "bg-[#2FA6DE]" : "bg-gray-400 cursor-not-allowed"}`}>
                                                Submit
                                            </button>

                                        </div>

                                    </div>
                                </div>
                            </div>
                        )}
                        {/* ======== END LOADING CONDITIONAL ======== */}
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
    searchable = true,
}: {
    label: string
    value: string
    options: string[]
    onSave: (v: string) => void
    onClear: () => void
    disabled?: boolean
    searchable?: boolean
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
                onClick={() => !disabled && setOpen(true)}
                className={`${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                <label className="text-sm font-semibold">{label} <span className="text-red-500">*</span></label>
                <div className="mt-2 px-5 py-3 border-2 border-[#2FA6DE] rounded-full flex justify-between items-center">
                    <span className={value ? '' : 'text-gray-400'}>{value || `Pilih ${label}`}</span>
                    <IoChevronDown />
                </div>
            </div>

            {/* POPUP */}
            {open && (
                <div
                    className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
                    onClick={() => setOpen(false)}>
                    <div
                        onClick={e => e.stopPropagation()}
                        className=" bg-white  p-6  rounded-xl  w-[700px]  max-h-[75vh]  flex flex-col">

                        <h2 className="font-bold text-lg mb-3">{label}</h2>

                        {/* SEARCH */}
                        {searchable && (
                            <input
                                placeholder="Cari..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="mb-3 px-4 py-2 border rounded-lg" />
                        )}

                        {/* LIST */}
                        <div className="overflow-y-auto flex-1">
                            {filtered.map(o => (
                                <div
                                    key={o}
                                    onClick={() => {
                                        onSave(o)
                                        setOpen(false)
                                        setSearch('')
                                    }}
                                    className={`py-2 px-3 cursor-pointer rounded-lg transition-all duration-2
                                    ${value === o ? 'font-bold text-blue-600' : 'hover:bg-gray-100'}`}>
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
                    }`} />
        </div>
    )
}
