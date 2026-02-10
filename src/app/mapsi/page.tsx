"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
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
  koordinat: string; // "lat,lng;lat,lng;lat,lng"
};

const defaultCenter: LatLng = [-5.147665, 119.432731];

/* ================= HITUNG JARAK ================= */

function haversine(a: LatLng, b: LatLng) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000; // meter

  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);

  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

/* ================= PARSER ================= */

function parseKoordinat(input: string): LatLng[] {
  if (!input) return [];

  return input
    .split(";")
    .map((p) => p.trim())
    .map((p) => p.split(",").map(Number))
    .filter(
      (v) =>
        v.length === 2 &&
        !isNaN(v[0]) &&
        !isNaN(v[1])
    ) as LatLng[];
}

/* ================= MAIN ================= */

export default function MapAutoDistance({ koordinat }: Props) {
  const points = useMemo(
    () => parseKoordinat(koordinat),
    [koordinat]
  );

  const distances = useMemo(() => {
    if (points.length < 2) return [];

    const d: number[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      d.push(haversine(points[i], points[i + 1]));
    }

    return d;
  }, [points]);

  const totalDistance = useMemo(() => {
    return distances.reduce((a, b) => a + b, 0);
  }, [distances]);

  const center = useMemo<LatLng>(() => {
    if (points.length > 0) return points[0];
    return defaultCenter;
  }, [points]);

  return (
    <div className="relative h-full w-full rounded-lg overflow-hidden border border-slate-300">

      <MapContainer
        center={center}
        zoom={16}
        className="w-full h-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {points.length > 1 && (
          <Polyline positions={points} />
        )}

        {points.map((p, i) => (
          <Marker
            key={i}
            position={p}
          />
        ))}
      </MapContainer>

      {/* PANEL JARAK */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-white/95 backdrop-blur p-3 text-sm border-t">

        {points.length < 2 ? (
          <div className="text-gray-500">
            Masukkan minimal 2 koordinat
          </div>
        ) : (
          <div className="space-y-1">
            {distances.map((d, i) => (
              <div
                key={i}
                className="flex justify-between"
              >
                <span>
                  Titik {i + 1} → {i + 2}
                </span>
                <span>
                  {d >= 1000
                    ? (d / 1000).toFixed(2) + " km"
                    : d.toFixed(0) + " m"}
                </span>
              </div>
            ))}

            <div className="border-t pt-1 mt-1 flex justify-between font-semibold">
              <span>Total</span>
              <span>
                {totalDistance >= 1000
                  ? (totalDistance / 1000).toFixed(2) +
                    " km"
                  : totalDistance.toFixed(0) + " m"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
