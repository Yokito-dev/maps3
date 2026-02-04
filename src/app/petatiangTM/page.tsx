'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import 'leaflet/dist/leaflet.css';

// ================= LEAFLET =================
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(m => m.Tooltip), { ssr: false });

// ================= API =================
const API_URL =
  'https://script.google.com/macros/s/AKfycbyv5K2f8C6wrBYIVguODJerwIUhlz4q2ZJsHBYYfJy84IfBAZI4ahx-Cq4NMhbFl_Q8/exec';

// ================= WARNA =================
const generateColor = (text: string) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${hash % 360}, 80%, 55%)`;
};

// ================= HAVERSINE =================
const haversine = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371e3; // meter
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function MapsPage() {
  const [mounted, setMounted] = useState(false);
  const [allData, setAllData] = useState<any[]>([]);
  const [selectedULP, setSelectedULP] = useState('');

  const [selectedPoints, setSelectedPoints] = useState<any[]>([]);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [distance, setDistance] = useState(0);

  const [mapType, setMapType] = useState<'normal' | 'satellite'>('normal');
  const [distanceMode, setDistanceMode] = useState<'straight' | 'road'>('road');

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    fetch(API_URL)
      .then(r => r.json())
      .then(setAllData);
  }, []);

  // ===== LIST ULP =====
  const ulpList = useMemo(() => {
    return Array.from(
      new Set(allData.map(d => d.PARENT_LOCATION).filter(Boolean))
    );
  }, [allData]);

  // ===== FILTER POINTS =====
  const points = useMemo(() => {
    return allData.filter(d =>
      d.PARENT_LOCATION &&
      !isNaN(+d.LATITUDEY) &&
      !isNaN(+d.LONGITUDEX) &&
      (!selectedULP || d.PARENT_LOCATION === selectedULP)
    );
  }, [allData, selectedULP]);

  // ================= HITUNG =================
  const handleHitung = () => {
    if (selectedPoints.length < 2) {
      alert('Pilih minimal 2 titik dulu');
      return;
    }

    // ===== GARIS LURUS =====
    if (distanceMode === 'straight') {
      const coords = selectedPoints.map(p => [
        +p.LATITUDEY,
        +p.LONGITUDEX
      ]) as [number, number][];

      let total = 0;
      for (let i = 0; i < coords.length - 1; i++) {
        total += haversine(
          coords[i][0],
          coords[i][1],
          coords[i + 1][0],
          coords[i + 1][1]
        );
      }

      setRouteCoords(coords);
      setDistance(total);
      return;
    }

    // ===== NGIKUT JALAN =====
    const start = selectedPoints[0];
    const end = selectedPoints[selectedPoints.length - 1];

    fetch(
      `https://router.project-osrm.org/route/v1/driving/${start.LONGITUDEX},${start.LATITUDEY};${end.LONGITUDEX},${end.LATITUDEY}?overview=full&geometries=geojson`
    )
      .then(r => r.json())
      .then(data => {
        const route = data.routes[0];
        setRouteCoords(
          route.geometry.coordinates.map((c: number[]) => [c[1], c[0]])
        );
        setDistance(route.distance);
      });
  };

  if (!mounted) return null;

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative' }}>

      {/* ===== MAP TYPE ===== */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: 60,
        zIndex: 1000,
        display: 'flex',
        borderRadius: 8,
        overflow: 'hidden'
      }}>
        <button onClick={() => setMapType('normal')}
          style={{
            padding: '6px 14px',
            border: 'none',
            background: mapType === 'normal' ? '#1e90ff' : '#f1f2f6',
            color: mapType === 'normal' ? '#fff' : '#333'
          }}>
          MAP
        </button>
        <button onClick={() => setMapType('satellite')}
          style={{
            padding: '6px 14px',
            border: 'none',
            background: mapType === 'satellite' ? '#1e90ff' : '#f1f2f6',
            color: mapType === 'satellite' ? '#fff' : '#333'
          }}>
          SATELIT
        </button>
      </div>

      {/* ===== CONTROL ===== */}
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1000,
        background: 'white',
        padding: 12,
        borderRadius: 10,
        width: 240
      }}>
        <select value={selectedULP}
          onChange={e => setSelectedULP(e.target.value)}
          style={{ width: '100%' }}>
          <option value="">Semua ULP</option>
          {ulpList.map((u, i) => <option key={i}>{u}</option>)}
        </select>

        <select value={distanceMode}
          onChange={e => setDistanceMode(e.target.value as any)}
          style={{ width: '100%', marginTop: 6 }}>
          <option value="road">Ngikut Jalan</option>
          <option value="straight">Garis Lurus</option>
        </select>

        <button onClick={handleHitung}
          style={{ width: '100%', marginTop: 8, background: '#1e90ff', color: '#fff' }}>
          HITUNG
        </button>

        <button onClick={() => {
          setSelectedPoints([]);
          setRouteCoords([]);
          setDistance(0);
        }} style={{ width: '100%', marginTop: 6 }}>
          RESET
        </button>

        <div style={{ fontSize: 12, marginTop: 6 }}>
          Titik dipilih: <b>{selectedPoints.length}</b>
        </div>

        {distance > 0 && (
          <div style={{ fontSize: 12 }}>
            Jarak: <b>{(distance / 1000).toFixed(2)} km</b>
          </div>
        )}
      </div>

      {/* ===== MAP ===== */}
      <MapContainer center={[-5.24, 119.49]} zoom={9} style={{ height: '100%' }}>
        {mapType === 'normal'
          ? <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          : <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
        }

        {routeCoords.length > 1 && (
          <Polyline positions={routeCoords} pathOptions={{ color: '#1e90ff', weight: 6 }} />
        )}

        {points.map((d, i) => {
          const idx = selectedPoints.findIndex(p =>
            p.LATITUDEY === d.LATITUDEY &&
            p.LONGITUDEX === d.LONGITUDEX
          );

          return (
            <CircleMarker
              key={i}
              center={[+d.LATITUDEY, +d.LONGITUDEX]}
              radius={7}
              pathOptions={{
                color: '#ffffff',
                weight: idx >= 0 ? 4 : 2,
                fillColor: generateColor(d.PARENT_LOCATION),
                fillOpacity: 1
              }}
              eventHandlers={{
                click: () => {
                  setSelectedPoints(prev =>
                    prev.some(p =>
                      p.LATITUDEY === d.LATITUDEY &&
                      p.LONGITUDEX === d.LONGITUDEX
                    )
                      ? prev.filter(p =>
                          !(p.LATITUDEY === d.LATITUDEY &&
                            p.LONGITUDEX === d.LONGITUDEX))
                      : [...prev, d]
                  );
                }
              }}>
              {idx >= 0 && <Tooltip permanent>{idx + 1}</Tooltip>}
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
