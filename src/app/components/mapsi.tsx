'use client'

import { memo, useEffect, useMemo, useState } from 'react' 
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
  useMapEvents
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

/* ===== Fix Icon Leaflet ===== */
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
})

type LatLng = [number, number]

type Props = {
  koordinat: string            // "lat,lng;lat,lng;..."
  onDistanceChange?: (km: number) => void
}

const defaultCenter: LatLng = [-5.147665, 119.432731]

/* ===== Fit Bounds ===== */
function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap()

  useEffect(() => {
    if (points.length === 0) return

    if (points.length === 1) {
      map.setView(points[0], 16)
    } else {
      const bounds = L.latLngBounds(points)
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [points, map])

  return null
}

/* ===== Klik Map → Tambah Titik ===== */
function AddPointOnClick({ onAdd }: { onAdd: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      const lat = e.latlng.lat
      const lng = e.latlng.lng
      onAdd([lat, lng])
    }
  })
  return null
}

/* ===== Haversine (Hitung Jarak) ===== */
function haversine(a: LatLng, b: LatLng) {
  const R = 6371
  const dLat = ((b[0] - a[0]) * Math.PI) / 180
  const dLng = ((b[1] - a[1]) * Math.PI) / 180

  const la1 = (a[0] * Math.PI) / 180
  const la2 = (b[0] * Math.PI) / 180

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) *
      Math.sin(dLng / 2) *
      Math.cos(la1) *
      Math.cos(la2)

  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
  return R * c
}

/* ===== Parse Koordinat dari String ===== */
function parseKoordinat(str: string): LatLng[] {
  if (!str) return []

  return str
    .split(';')
    .map(p => p.split(',').map(v => Number(v.trim())))
    .filter(a => a.length === 2 && !isNaN(a[0]) && !isNaN(a[1])) as LatLng[]
}

/* ========================   MAPSI COMPONENT   ===================== */

const Mapsi = memo(function Mapsi({ koordinat, onDistanceChange }: Props) {
  const initialPoints = useMemo(() => parseKoordinat(koordinat), [koordinat])
  const [localPoints, setLocalPoints] = useState<LatLng[]>(initialPoints)

  /* Jika koordinat dari props berubah, sinkronkan ulang */
  useEffect(() => {
    setLocalPoints(initialPoints)
  }, [initialPoints])

  /* Hitung total jarak */
  const totalKm = useMemo(() => {
    let sum = 0
    for (let i = 0; i < localPoints.length - 1; i++) {
      sum += haversine(localPoints[i], localPoints[i + 1])
    }
    return sum
  }, [localPoints])

  useEffect(() => {
    onDistanceChange?.(Number(totalKm.toFixed(3)))
  }, [totalKm, onDistanceChange])

  /* Klik map → tambah titik */
  const handleAddPoint = (p: LatLng) => {
    setLocalPoints(prev => [...prev, p])
  }

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden">
      <MapContainer
        center={defaultCenter}
        zoom={15}
        className="w-full h-full"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <FitBounds points={localPoints} />

        {/* Klik map → tambah titik */}
        <AddPointOnClick onAdd={handleAddPoint} />

        {localPoints.map((p, i) => (
          <Marker key={i} position={p}>
            <Popup>
              Titik {i + 1}
              <br />
              {p[0].toFixed(6)}, {p[1].toFixed(6)}
            </Popup>
          </Marker>
        ))}

        {localPoints.length >= 2 && (
          <Polyline positions={localPoints} />
        )}
      </MapContainer>

      {/* Box info jarak */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow text-sm">
        Total jarak : <b>{totalKm.toFixed(3)} km</b>
      </div>
    </div>
  )
})

export default Mapsi
