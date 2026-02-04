"use client";

import { useState, useRef, memo, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

/* ================= ICON FIX ================= */
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

type LatLng = [number, number];

type Props = {
  koordinat: string;
  onChange: (v: string) => void;
};

const defaultCenter: LatLng = [-5.147665, 119.432731];

function AddMarkerOnClick({
  onAdd,
}: {
  onAdd: (pos: LatLng) => void;
}) {
  const map = useMapEvents({
    click(e) {
      const pos: LatLng = [e.latlng.lat, e.latlng.lng];
      onAdd(pos);
      map.panTo(pos);
    },
  });

  return null;
}

const LeafletMap = memo(function LeafletMap({
  satellite,
  markers,
  onAdd,
  onRemove,
  mapRef,
}: {
  satellite: boolean;
  markers: LatLng[];
  onAdd: (pos: LatLng) => void;
  onRemove: (i: number) => void;
  mapRef: React.MutableRefObject<L.Map | null>;
}) {
  return (
    <MapContainer
      center={defaultCenter}
      zoom={16}
      zoomControl
      className="w-full h-full"
      ref={mapRef}
    >
      <TileLayer
        url={
          satellite
            ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        }
      />

      <AddMarkerOnClick onAdd={onAdd} />

      {markers.map((m, i) => (
        <Marker key={`${m[0]}-${m[1]}-${i}`} position={m}>
          <Popup>
            <div className="flex flex-col gap-2">
              <span>
                {m[0].toFixed(6)}, {m[1].toFixed(6)}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();   // ⬅️ PENTING
                  onRemove(i);
                }}
                className="bg-red-500 text-white px-2 py-1 rounded">
                Hapus titik
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
});

export default function MapPicker({ koordinat, onChange }: Props) {
  const [markers, setMarkers] = useState<LatLng[]>([]);
  const [satellite, setSatellite] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  /* ✅ sinkronkan state dengan props */
  useEffect(() => {
    if (!koordinat) {
      setMarkers([]);
      return;
    }

    const parsed = koordinat
      .split(";")
      .map((p) => p.split(",").map(Number))
      .filter((a) => a.length === 2 && !isNaN(a[0]) && !isNaN(a[1])) as LatLng[];

    setMarkers(parsed);
  }, [koordinat]);

  const handleAdd = (pos: LatLng) => {
    const newMarkers = [...markers, pos];
    setMarkers(newMarkers);
    onChange(newMarkers.map((m) => `${m[0]},${m[1]}`).join(";"));
  };

  const handleRemove = (index: number) => {
    const newMarkers = markers.filter((_, i) => i !== index);
    setMarkers(newMarkers);
    onChange(newMarkers.map((m) => `${m[0]},${m[1]}`).join(";"));
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      alert("GPS tidak tersedia");
      return;
    }

    navigator.geolocation.getCurrentPosition((pos) => {
      const userPos: LatLng = [
        pos.coords.latitude,
        pos.coords.longitude,
      ];

      const newMarkers = [...markers, userPos];
      setMarkers(newMarkers);
      onChange(newMarkers.map((m) => `${m[0]},${m[1]}`).join(";"));

      if (mapRef.current) {
        mapRef.current.setView(userPos, 16);
      }
    });
  };

  return (
    <div className="relative h-full rounded-lg overflow-hidden border border-slate-300">
      <LeafletMap
        satellite={satellite}
        markers={markers}
        onAdd={handleAdd}
        onRemove={handleRemove}
        mapRef={mapRef}
      />

      {/* overlay tombol */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setSatellite(p => !p)}
          className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow text-sm"
        >
          {satellite ? 'Peta' : 'Satelit'}
        </button>

        <button
          type="button"
          onClick={locateMe}
          className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow text-sm"
        >
          📍 Lokasi saya
        </button>

        {/* RESET */}
        <button
          type="button"
          onClick={() => {
            setMarkers([])
            onChange('')
          }}
          className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow text-sm text-red-600"
        >
          🗑 Reset titik
        </button>
      </div>
    </div>
  );
}
