'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

const API_URL =
  'https://script.google.com/macros/s/AKfycbyCxXZWyPBCJsyuLZpeynkr6V5FGCsLZopQaUQTPRIMKA6vpXriueq26O1n-SrsK_ALfA/exec'

export default function ScheduleDetailPage() {
  const params = useParams()
  const id = params?.id as string

  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    setLoading(true)

    fetch(`${API_URL}?type=schedule_detail&id=${id}`)
      .then(res => res.json())
      .then(res => {
        setData(res)
      })
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* BACKDROP */}
      <div
        onClick={() => router.back()}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      {/* MODAL */}
      <div
        className="
          relative
          bg-white
          rounded-2xl
          shadow-xl
          w-full
          max-w-md
          z-10
          max-h-[90vh]
          overflow-hidden
        "
      >
        {/* HEADER */}
        <div className="px-6 py-4 border-b font-semibold">
          Detail Schedule JTM
        </div>

        {/* CONTENT */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto max-h-[80vh]">

          {loading && (
            <p className="text-center text-gray-400">
              Memuat detail...
            </p>
          )}

          {!loading && data && (
            <>
              <Item label="UP3" value={data.up3} />
              <Item label="ULP" value={data.ulp} />
              <Item label="PENYULANG" value={data.penyulang} />
              <Item label="ZONA PROTEKSI" value={data.zona} />
              <Item label="SECTION" value={data.section} />
              <Item label="PANJANG ASSET (KM)" value={data.kms_aset} />
              <Item label="KMS INSPEKSI" value={data.kms_inspeksi} />
              <Item label="TUJUAN PENJADWALAN" value={data.tujuan_penjadwalan} />

              <ProgressItem value={data.progress} />

              <Item label="KETERANGAN JADWAL" value={data.keterangan} />
            </>
          )}

        </div>
      </div>
    </div>
  )
}

/* ================= COMPONENT ================= */

const Item = ({ label, value }: any) => (
  <div className="space-y-1 text-left">
    <p className="text-xs text-gray-500">{label}</p>
    <p className="font-medium break-words">
      {value || '-'}
    </p>
  </div>
)

const ProgressItem = ({ value }: any) => {
  const v = (value || '').toString().toLowerCase().trim()

  let color = 'bg-gray-400'

  // ⚠️ urutan penting
  if (v.includes('done')) color = 'bg-blue-500'
  else if (v.includes('open')) color = 'bg-yellow-500'
  else if (v.includes('on')) color = 'bg-green-500'

  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-500">PROGRESS</p>

      <div className="flex items-center gap-2">
        <div
          className={`w-6 h-6 rounded-full ${color} text-white flex items-center justify-center`}
        >
          ✓
        </div>

        <p className="font-medium">
          {value || '-'}
        </p>
      </div>
    </div>
  )
}
