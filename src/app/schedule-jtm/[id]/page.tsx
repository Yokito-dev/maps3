'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

const API_URL =
  'https://script.google.com/macros/s/AKfycbyCxXZWyPBCJsyuLZpeynkr6V5FGCsLZopQaUQTPRIMKA6vpXriueq26O1n-SrsK_ALfA/exec'

export default function ScheduleDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetch(`${API_URL}?type=schedule_detail&id=${id}`)
      .then(res => res.json())
      .then(setData)
  }, [id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* BACKDROP */}
      <div
        onClick={() => router.back()}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* MODAL */}
      <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md z-10 space-y-4">
        {!data ? (
          <p className="text-center text-gray-400">Memuat detail...</p>
        ) : (
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
  )
}

/* ====== COMPONENT ====== */

const Item = ({ label, value }: any) => (
  <div className="space-y-1 text-left">
    <p className="text-xs text-gray-500">{label}</p>
    <p className="font-medium">{value || '-'}</p>
  </div>
)

const ProgressItem = ({ value }: any) => {
  const color =
    value?.toLowerCase().includes('open')
      ? 'bg-yellow-500'
      : value?.toLowerCase().includes('on')
      ? 'bg-green-500'
      : value?.toLowerCase().includes('done')
      ? 'bg-blue-500'
      : 'bg-gray-400'

  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-500">PROGRESS</p>
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-full ${color} text-white flex items-center justify-center`}>
          ✓
        </div>
        <p className="font-medium">{value || '-'}</p>
      </div>
    </div>
  )
}
