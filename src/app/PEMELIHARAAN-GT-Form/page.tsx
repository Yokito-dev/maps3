'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState, ChangeEvent, useEffect } from 'react';
import Image from 'next/image';
import { IoArrowBack, IoChevronDown, IoClose, IoAdd, IoLocationSharp } from 'react-icons/io5';
import { useRouter } from 'next/navigation';

import bg from '@/app/assets/plnup3/bgnogradient.png';
import plnKecil from '@/app/assets/plnup3/plnkecil.svg';

const MapPicker = dynamic(() => import('../components/MapPicker'), { ssr: false });

const API_URL =
  'https://script.google.com/macros/s/AKfycbzRDMaCMfNqLKd_wqrQBiHj074VPKruyxW0tJkkd6UL621eoA374IlF9lamc1JX1dBJ/exec';

/* ================= TYPES ================= */

type AsetGdRow = {
  up3: string;
  ulp: string;
  namaGardu: string;
  penyulang: string;
  zona: string;
  section: string;
  longlat: string;
  kapasitas: string;
  fasa: string;
};

type KonstruksiType = 'PORTAL' | 'CANTOL';

type FormState = {
  up3: string;
  ulp: string;
  tanggalHar: string;

  namaGardu: string;
  longlat: string;
  kapasitas: string;

  konstruksi: KonstruksiType;
  fuselinkMax: string;
  bebanTrMax: string;

  alasan: string[];
  pemeliharaan: string[];

  dieksekusiOleh: string;
  jumlahItemMaterial: string;

  nilaiTahananIsolasiSesudah: string;
  nilaiPentanahanSetelahPerbaikan: string;
  keterangan: string;
};

type ImagePayload = { filename: string; mimeType: string; base64: string };

type ToastState = {
  open: boolean;
  variant: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
};

/* ================= OPTIONS ================= */

const MENGAPA_GARDU_DIPELIHARA_OPTIONS = [
  'ADANYA FLASHOVER/KORONA/SUARA MENDESIS',
  'PERUBAHAN DARI OPEN CELL KE KUBIKEL',
  'POSISI PERALATAN DAN TRAFO TANPA SEKAT',
  'TIDAK ADANYA DUDUKAN KUBIKEL',
  'KONDISI RUANGAN SANGAT LEMBAB',
  'PANEL PHBTR KOTOR',
  'PIPA KABEL TIDAK ADA/RUSAK',
];

const APA_YANG_DILAKUKAN_OPTIONS = [
  'PENGGANTIAN FUSELINK',
  'PENGENCANGAN KONEKSI',
  'PEMBERSIHAN BUSHING / TERMINAL',
  'PEMBERSIHAN PANEL / KUBIKEL',
  'PERBAIKAN PENTANAHAN',
  'PENGECATAN GARDU',
  'PERBAIKAN PINTU GARDU',
  'PENGGANTIAN AKSESORIS',
  'PEMERIKSAAN DAN PENGUJIAN',
  'PERBAIKAN KONSTRUKSI',
  'PENGGANTIAN NAME PLATE',
];

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
];

/* ================= HELPERS ================= */

const norm = (v: any) => String(v ?? '').trim().toUpperCase();

const uniquePretty = (arr: any[]) => {
  const m = new Map<string, string>();
  for (const v of arr) {
    const raw = String(v ?? '').trim();
    const k = norm(raw);
    if (k && !m.has(k)) m.set(k, raw);
  }
  return Array.from(m.values()).sort();
};

const fmtCoord = (n: number) => {
  if (!Number.isFinite(n)) return '';
  return n.toFixed(6);
};

const toNumber = (v: string) => {
  const n = Number(String(v || '0').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const formatStepValue = (n: number, decimals = 0) => {
  const safe = Math.max(0, n);
  return decimals > 0 ? safe.toFixed(decimals) : String(Math.round(safe));
};

const fileToBase64Payload = (file: File) =>
  new Promise<ImagePayload>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.onload = () => {
      const res = String(reader.result || '');
      const base64 = res.includes(',') ? res.split(',')[1] : res;
      resolve({
        filename: file.name || `image_${Date.now()}.jpg`,
        mimeType: file.type || 'image/jpeg',
        base64,
      });
    };
    reader.readAsDataURL(file);
  });

const maybeFileToBase64Payload = async (file: File | null) => {
  if (!file) return null;
  return fileToBase64Payload(file);
};

/* ================= PAGE ================= */

export default function Page() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* ========= TOAST ========= */
  const [toast, setToast] = useState<ToastState>({
    open: false,
    variant: 'info',
    title: '',
    message: '',
  });

  const showToast = (t: Omit<ToastState, 'open'>) => {
    setToast({ open: true, ...t });
    window.setTimeout(() => setToast(p => ({ ...p, open: false })), 4500);
  };

  /* ========= FETCH ASET ========= */

  const [aset, setAset] = useState<AsetGdRow[]>([]);
  const [asetLoading, setAsetLoading] = useState(false);
  const [asetError, setAsetError] = useState<string>('');

  useEffect(() => {
    const run = async () => {
      try {
        setAsetLoading(true);
        setAsetError('');

        const res = await fetch(`${API_URL}?type=aset&_=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
        });

        const json = (await res.json()) as {
          data?: AsetGdRow[];
          ok?: boolean;
          error?: boolean;
          message?: string;
        };

        if (!res.ok || json?.error || json?.ok === false) {
          throw new Error(json?.message || `HTTP ${res.status}`);
        }

        setAset(Array.isArray(json.data) ? json.data : []);
      } catch (e: any) {
        setAsetError(e?.message || 'Gagal mengambil data ASET GD');
        setAset([]);
      } finally {
        setAsetLoading(false);
      }
    };

    if (mounted) run();
  }, [mounted]);

  /* ========= FORM ========= */

  const [form, setForm] = useState<FormState>({
    up3: 'UP3 MAKASSAR SELATAN',
    ulp: '',
    tanggalHar: '',

    namaGardu: '',
    longlat: '',
    kapasitas: '0',

    konstruksi: 'PORTAL',
    fuselinkMax: '0.00',
    bebanTrMax: '0.00',

    alasan: [],
    pemeliharaan: [],

    dieksekusiOleh: '',
    jumlahItemMaterial: '0',

    nilaiTahananIsolasiSesudah: '0.00',
    nilaiPentanahanSetelahPerbaikan: '0.00',
    keterangan: '',
  });

  const handleChange = <K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm(p => ({ ...p, [key]: val }));
  };

  /* ========= MAP (live when opened) ========= */

  const [showMap, setShowMap] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [geoError, setGeoError] = useState('');

  const openMapLive = () => {
    setShowMap(true);
    setGeoError('');
    setTracking(true);
  };

  const closeMap = () => {
    setShowMap(false);
    setTracking(false);
    setGeoError('');
  };

  useEffect(() => {
    if (!tracking) return;

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGeoError('Perangkat tidak mendukung GPS (Geolocation).');
      setTracking(false);
      return;
    }

    const id = navigator.geolocation.watchPosition(
      pos => {
        const lat = fmtCoord(pos.coords.latitude);
        const lng = fmtCoord(pos.coords.longitude);
        const v = lat && lng ? `${lat},${lng}` : '';
        if (v) setForm(p => ({ ...p, longlat: v }));
      },
      err => {
        setGeoError(err?.message || 'Gagal mengambil lokasi GPS.');
        setTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [tracking]);

  /* ========= DROPDOWN / AUTOFILL ========= */

  const baseUp3Rows = useMemo(() => aset.filter(a => norm(a.up3) === norm(form.up3)), [aset, form.up3]);

  const ULP_LIST = useMemo(() => uniquePretty(baseUp3Rows.map(a => a.ulp)), [baseUp3Rows]);

  const NAMA_GARDU_LIST = useMemo(() => {
    const all = uniquePretty(baseUp3Rows.map(a => a.namaGardu));
    if (!form.ulp) return all;

    return uniquePretty(
      baseUp3Rows.filter(a => norm(a.ulp) === norm(form.ulp)).map(a => a.namaGardu)
    );
  }, [baseUp3Rows, form.ulp]);

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      namaGardu: '',
      longlat: '',
      kapasitas: '0',
    }));
    closeMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.ulp]);

  useEffect(() => {
    if (!form.namaGardu) return;

    const row = baseUp3Rows.find(a => {
      if (form.ulp && norm(a.ulp) !== norm(form.ulp)) return false;
      return norm(a.namaGardu) === norm(form.namaGardu);
    });

    if (!row) return;

    setForm(prev => ({
      ...prev,
      longlat: row.longlat || prev.longlat || '',
      kapasitas: row.kapasitas || prev.kapasitas || '0',
    }));
  }, [form.namaGardu, form.ulp, baseUp3Rows]);

  /* ================= FOTO ================= */

  const [fotoSebelum1, setFotoSebelum1] = useState<File | null>(null);
  const [fotoSebelum2, setFotoSebelum2] = useState<File | null>(null);
  const [fotoProsesPekerjaan, setFotoProsesPekerjaan] = useState<File | null>(null);
  const [fotoSesudah1, setFotoSesudah1] = useState<File | null>(null);
  const [fotoSesudah2, setFotoSesudah2] = useState<File | null>(null);
  const [fotoNamePlate, setFotoNamePlate] = useState<File | null>(null);

  /* ================= VALIDASI ================= */

  const isNonEmpty = (v: unknown) => {
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'string') return v.trim() !== '';
    return false;
  };

  const isFormValid =
    isNonEmpty(form.up3) &&
    isNonEmpty(form.ulp) &&
    isNonEmpty(form.tanggalHar) &&
    isNonEmpty(form.namaGardu) &&
    isNonEmpty(form.longlat) &&
    isNonEmpty(form.kapasitas) &&
    isNonEmpty(form.konstruksi) &&
    isNonEmpty(form.fuselinkMax) &&
    isNonEmpty(form.bebanTrMax) &&
    isNonEmpty(form.alasan) &&
    isNonEmpty(form.pemeliharaan) &&
    isNonEmpty(form.dieksekusiOleh) &&
    isNonEmpty(form.jumlahItemMaterial) &&
    fotoSebelum1 &&
    fotoProsesPekerjaan &&
    fotoSesudah1;

  /* ================= SUBMIT ================= */

  const [submitting, setSubmitting] = useState(false);

  const alasanText = useMemo(() => {
    return form.alasan
      .map(v => {
        const idx = MENGAPA_GARDU_DIPELIHARA_OPTIONS.indexOf(v);
        return idx >= 0 ? `(${idx + 1}) ${v}` : v;
      })
      .join(', ');
  }, [form.alasan]);

  const pemeliharaanText = useMemo(() => {
    return form.pemeliharaan.map(v => `- ${v}`).join('\n');
  }, [form.pemeliharaan]);

  const resetForm = () => {
    setForm(prev => ({
      ...prev,
      ulp: '',
      tanggalHar: '',
      namaGardu: '',
      longlat: '',
      kapasitas: '0',

      konstruksi: 'PORTAL',
      fuselinkMax: '0.00',
      bebanTrMax: '0.00',

      alasan: [],
      pemeliharaan: [],

      dieksekusiOleh: '',
      jumlahItemMaterial: '0',

      nilaiTahananIsolasiSesudah: '0.00',
      nilaiPentanahanSetelahPerbaikan: '0.00',
      keterangan: '',
    }));

    setFotoSebelum1(null);
    setFotoSebelum2(null);
    setFotoProsesPekerjaan(null);
    setFotoSesudah1(null);
    setFotoSesudah2(null);
    setFotoNamePlate(null);
    closeMap();
  };

  const handleSubmit = async () => {
    if (!isFormValid || submitting) return;

    try {
      setSubmitting(true);
      showToast({ variant: 'info', title: 'Mengirim...', message: 'Sedang upload foto & simpan data' });

      const [
        sebelum1,
        sebelum2,
        proses,
        sesudah1,
        sesudah2,
        namePlate,
      ] = await Promise.all([
        maybeFileToBase64Payload(fotoSebelum1),
        maybeFileToBase64Payload(fotoSebelum2),
        maybeFileToBase64Payload(fotoProsesPekerjaan),
        maybeFileToBase64Payload(fotoSesudah1),
        maybeFileToBase64Payload(fotoSesudah2),
        maybeFileToBase64Payload(fotoNamePlate),
      ]);

      const payload = {
        type: 'pemeliharaanGT',
        data: {
          ...form,
          alasanText,
          pemeliharaanText,
        },
        images: {
          fotoSebelum1: sebelum1,
          fotoSebelum2: sebelum2,
          fotoProsesPekerjaan: proses,
          fotoSesudah1: sesudah1,
          fotoSesudah2: sesudah2,
          fotoNamePlate: namePlate,
        },
      };

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.message || `HTTP ${res.status}`);
      }

      const warnings = Array.isArray(json?.warnings) ? json.warnings : [];
      if (warnings.length) {
        showToast({ variant: 'warning', title: 'Tersimpan, tapi ada catatan', message: warnings.join(' • ') });
      } else {
        showToast({ variant: 'success', title: 'Berhasil ✅', message: 'Data sudah masuk ke PEMELIHARAAN GT' });
      }

      resetForm();
    } catch (e: any) {
      showToast({ variant: 'error', title: 'Gagal ❌', message: e?.message || 'Submit gagal' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    showToast({ variant: 'info', title: 'Dibatalkan', message: 'Form direset' });
  };

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center font-poppins">
        <div className="text-sm text-gray-600">Loading...</div>
      </div>
    );
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
                  Error fetch ASET: {asetError} <span className="text-gray-500">(dropdown tetap tampil semua opsi)</span>
                </div>
              )}
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
              <Input label="UP3" value={form.up3} readOnly />

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

              <Input
                label="Tanggal HAR Gardu"
                type="date"
                value={form.tanggalHar}
                onChange={e => handleChange('tanggalHar', e.target.value)}
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

              <div className="md:col-span-2">
                <label className="text-sm font-semibold">
                  LONG / LAT <span className="text-red-500">*</span>
                </label>

                <div className="mt-2">
                  <div className="relative">
                    <input
                      value={form.longlat}
                      onChange={e => {
                        if (tracking) setTracking(false);
                        handleChange('longlat', e.target.value);
                      }}
                      className="w-full py-3 pl-5 pr-12 border-2 border-[#2FA6DE] rounded-full"
                      placeholder="Contoh: -5.123456,119.123456"
                      autoComplete="off"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        if (showMap) closeMap();
                        else openMapLive();
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
                            if (tracking) setTracking(false);
                            handleChange('longlat', v);
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {showMap && (
                    <div className="mt-2 text-[11px] text-gray-500">
                      Map dibuka otomatis mode live. Kalau kamu edit input / pilih titik manual, live berhenti. Tutup &
                      buka map lagi untuk live ulang.
                    </div>
                  )}
                </div>
              </div>

              <NumberStepper
                label="Kapasitas"
                value={form.kapasitas}
                onChange={v => handleChange('kapasitas', v)}
              />

              <KonstruksiToggle
                value={form.konstruksi}
                onChange={v => handleChange('konstruksi', v)}
              />

              <NumberStepper
                label="Fuselink Max"
                value={form.fuselinkMax}
                onChange={v => handleChange('fuselinkMax', v)}
                step={0.01}
                decimals={2}
              />

              <NumberStepper
                label="Beban TR Max"
                value={form.bebanTrMax}
                onChange={v => handleChange('bebanTrMax', v)}
                step={0.01}
                decimals={2}
              />

              <PopupMultiSelect
                label="Mengapa Gardu dipelihara ?"
                value={form.alasan}
                options={MENGAPA_GARDU_DIPELIHARA_OPTIONS}
                onSave={v => handleChange('alasan', v)}
                onClear={() => handleChange('alasan', [])}
                displayMode="commaNumbered"
                searchable
              />

              <PopupMultiSelect
                label="Apa yang dilakukan ?"
                value={form.pemeliharaan}
                options={APA_YANG_DILAKUKAN_OPTIONS}
                onSave={v => handleChange('pemeliharaan', v)}
                onClear={() => handleChange('pemeliharaan', [])}
                displayMode="bullets"
                searchable
              />

              <PopupSelect
                label="Dieksekusi oleh"
                value={form.dieksekusiOleh}
                options={DIEKSEKUSI_OLEH_OPTIONS}
                searchable
                onSave={v => handleChange('dieksekusiOleh', v)}
                onClear={() => handleChange('dieksekusiOleh', '')}
              />

              <NumberStepper
                label="Jumlah item material"
                value={form.jumlahItemMaterial}
                onChange={v => handleChange('jumlahItemMaterial', v)}
              />

              <UploadPreview label="Foto Sebelum (1)" file={fotoSebelum1} setFile={setFotoSebelum1} required />
              <UploadPreview label="Foto Sebelum (2)" file={fotoSebelum2} setFile={setFotoSebelum2} />

              <UploadPreview label="Foto Proses Pekerjaan" file={fotoProsesPekerjaan} setFile={setFotoProsesPekerjaan} required />
              <UploadPreview label="Foto Sesudah (1)" file={fotoSesudah1} setFile={setFotoSesudah1} required />

              <UploadPreview label="Foto Sesudah (2)" file={fotoSesudah2} setFile={setFotoSesudah2} />
              <UploadPreview label="Foto Name Plate" file={fotoNamePlate} setFile={setFotoNamePlate} />

              <NumberStepper
                label="Nilai Tahanan Isolasi Sesudah"
                value={form.nilaiTahananIsolasiSesudah}
                onChange={v => handleChange('nilaiTahananIsolasiSesudah', v)}
                step={0.01}
                decimals={2}
                required={false}
              />

              <NumberStepper
                label="Nilai Pentanahan Setelah Perbaikan"
                value={form.nilaiPentanahanSetelahPerbaikan}
                onChange={v => handleChange('nilaiPentanahanSetelahPerbaikan', v)}
                step={0.01}
                decimals={2}
                required={false}
              />

              <div className="md:col-span-2">
                <TextArea
                  label="Keterangan"
                  value={form.keterangan}
                  onChange={e => handleChange('keterangan', e.target.value)}
                />
              </div>
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
                {submitting ? 'Submitting...' : 'Save'}
              </button>
            </div>

            {!isFormValid && (
              <div className="mt-6 text-xs text-gray-500 text-center">
                Lengkapi semua field wajib & upload foto wajib untuk bisa Save.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ================= TOAST ================= */

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast.open) return null;

  const styles =
    toast.variant === 'success'
      ? 'border-green-200 bg-green-50 text-green-800'
      : toast.variant === 'error'
      ? 'border-red-200 bg-red-50 text-red-800'
      : toast.variant === 'warning'
      ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
      : 'border-blue-200 bg-blue-50 text-blue-800';

  const dot =
    toast.variant === 'success'
      ? 'bg-green-500'
      : toast.variant === 'error'
      ? 'bg-red-500'
      : toast.variant === 'warning'
      ? 'bg-yellow-500'
      : 'bg-blue-500';

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
  );
}

/* ================= COMPONENTS ================= */

type NumberStepperProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  step?: number;
  decimals?: number;
};

function NumberStepper({
  label,
  value,
  onChange,
  required = true,
  step = 1,
  decimals = 0,
}: NumberStepperProps) {
  const num = toNumber(value);

  return (
    <div>
      <label className="text-sm font-semibold">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div className="flex items-center gap-3 mt-2">
        <input
          type="number"
          step={decimals > 0 ? step : 1}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete="off"
          className="flex-1 py-3 px-5 border-2 border-[#2FA6DE] rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-[#2FA6DE]/30"
        />

        <button
          type="button"
          onClick={() => onChange(formatStepValue(num - step, decimals))}
          className="w-12 h-12 border rounded-full text-xl bg-white hover:bg-gray-50 active:scale-[0.98]"
        >
          −
        </button>

        <button
          type="button"
          onClick={() => onChange(formatStepValue(num + step, decimals))}
          className="w-12 h-12 border rounded-full text-xl bg-white hover:bg-gray-50 active:scale-[0.98]"
        >
          +
        </button>
      </div>
    </div>
  );
}

function KonstruksiToggle({
  value,
  onChange,
}: {
  value: KonstruksiType;
  onChange: (value: KonstruksiType) => void;
}) {
  return (
    <div>
      <label className="text-sm font-semibold">
        Konstruksi <span className="text-red-500">*</span>
      </label>

      <div className="grid grid-cols-2 gap-3 mt-2">
        {(['PORTAL', 'CANTOL'] as KonstruksiType[]).map(item => {
          const active = value === item;

          return (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item)}
              className={`py-3 px-5 rounded-full border-2 font-medium transition ${
                active
                  ? 'bg-[#2FA6DE] border-[#2FA6DE] text-white'
                  : 'bg-white border-[#2FA6DE] text-[#2FA6DE] hover:bg-[#2FA6DE]/5'
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type UploadPreviewProps = {
  label: string;
  file: File | null;
  setFile: (file: File | null) => void;
  required?: boolean;
};

function UploadPreview({ label, file, setFile, required = false }: UploadPreviewProps) {
  const [open, setOpen] = useState(false);
  const preview = file ? URL.createObjectURL(file) : null;

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <>
      <div>
        <label className="text-sm font-semibold">
          {label} {required && <span className="text-red-500">*</span>}
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
  );
}

type PopupSelectProps = {
  label: string;
  value: string;
  options: string[];
  onSave: (value: string) => void;
  onClear: () => void;
  disabled?: boolean;
  searchable?: boolean;
  allowCustom?: boolean;
};

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
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const safeOptions = Array.isArray(options) ? options.filter(Boolean) : [];
  const filtered = searchable ? safeOptions.filter(o => o.toLowerCase().includes(search.toLowerCase())) : safeOptions;

  const customCandidate = search.trim();
  const canAddCustom = allowCustom && searchable && customCandidate && !safeOptions.some(o => norm(o) === norm(customCandidate));

  return (
    <>
      <div onClick={() => !disabled && setOpen(true)} className={`cursor-pointer ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <label className="text-sm font-semibold">
          {label} <span className="text-red-500">*</span>
        </label>

        <div
          className={`mt-2 px-5 py-3 rounded-full flex items-center justify-between border-2 transition ${
            value ? 'border-[#2FA6DE] bg-[#2FA6DE]/5' : 'border-[#2FA6DE]'
          } hover:bg-[#2FA6DE]/5`}
        >
          <span className={value ? '' : 'text-gray-400'}>{value || `Pilih ${label}`}</span>
          <IoChevronDown />
        </div>
      </div>

      {open && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div onClick={e => e.stopPropagation()} className="bg-white p-6 rounded-xl w-[700px] max-w-[92vw] max-h-[75vh] flex flex-col">
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
                    onSave(customCandidate);
                    setOpen(false);
                    setSearch('');
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
                  const selected = norm(o) === norm(value);
                  return (
                    <div
                      key={o}
                      onClick={() => {
                        onSave(o);
                        setOpen(false);
                        setSearch('');
                      }}
                      className={`py-2 px-3 rounded-lg cursor-pointer ${
                        selected ? 'bg-[#E8F5FB] text-blue-600 font-semibold' : 'hover:bg-gray-100'
                      }`}
                    >
                      {o}
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => {
                onClear();
                setOpen(false);
                setSearch('');
              }}
              className="text-red-500 mt-3"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ===== MULTI SELECT ===== */

type MultiDisplayMode = 'commaNumbered' | 'bullets';

type PopupMultiSelectProps = {
  label: string;
  value: string[];
  options: string[];
  onSave: (value: string[]) => void;
  onClear: () => void;
  displayMode?: MultiDisplayMode;
  searchable?: boolean;
};

function PopupMultiSelect({
  label,
  value,
  options,
  onSave,
  onClear,
  displayMode = 'commaNumbered',
  searchable = false,
}: PopupMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [temp, setTemp] = useState<string[]>(value);

  useEffect(() => {
    if (open) setTemp(value);
  }, [open, value]);

  const safeOptions = Array.isArray(options) ? options.filter(Boolean) : [];
  const filtered = searchable ? safeOptions.filter(o => o.toLowerCase().includes(search.toLowerCase())) : safeOptions;

  const displayText = useMemo(() => {
    if (value.length === 0) return `Pilih ${label}`;
    if (displayMode === 'bullets') return value.map(v => `- ${v}`).join('\n');

    return value
      .map(v => {
        const idx = safeOptions.indexOf(v);
        return idx >= 0 ? `(${idx + 1}) ${v}` : v;
      })
      .join(', ');
  }, [value, label, displayMode, safeOptions]);

  const toggle = (opt: string) => {
    setTemp(prev => (prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]));
  };

  return (
    <>
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        <label className="text-sm font-semibold">
          {label} <span className="text-red-500">*</span>
        </label>

        <div
          className={`mt-2 px-5 py-3 rounded-full flex items-center justify-between border-2 transition ${
            value.length ? 'border-[#2FA6DE] bg-[#2FA6DE]/5' : 'border-[#2FA6DE]'
          } hover:bg-[#2FA6DE]/5`}
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
          <div onClick={e => e.stopPropagation()} className="bg-white p-6 rounded-xl w-[700px] max-w-[92vw] max-h-[75vh] flex flex-col">
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
                const selected = temp.includes(o);
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
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => {
                  onClear();
                  setTemp([]);
                  setOpen(false);
                  setSearch('');
                }}
                className="text-red-500"
              >
                Clear
              </button>

              <button
                onClick={() => {
                  onSave(temp);
                  setOpen(false);
                  setSearch('');
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
  );
}

type InputProps = {
  label: string;
  value: string;
  type?: string;
  readOnly?: boolean;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
};

function Input({ label, value, type = 'text', onChange, readOnly = false }: InputProps) {
  const isDateEmpty = type === 'date' && !value;

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
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <div>
      <label className="text-sm font-semibold">{label}</label>

      <textarea
        value={value}
        onChange={onChange}
        rows={4}
        className="mt-2 w-full py-3 px-5 border-2 border-[#2FA6DE] rounded-3xl bg-white
          focus:outline-none focus:ring-2 focus:ring-[#2FA6DE]/30 resize-none"
        placeholder="Tambahkan keterangan..."
      />
    </div>
  );
}