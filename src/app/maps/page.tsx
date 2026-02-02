'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import 'leaflet/dist/leaflet.css';

// Dynamic import biar aman di Next.js
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false });

const API_URL =
  'https://script.google.com/macros/s/AKfycbw6Cmea76qHD7NA0ajAW6zW5oXwICbiDFUuaK3s_lYmURksvnCqbMNktV55BY4-zhpz/exec';

export default function MapsPage() {
  const [allData, setAllData] = useState<any[]>([]);
  const [selectedULP, setSelectedULP] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API_URL)
      .then(r => r.json())
      .then(d => {
        setAllData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // Ambil daftar ULP unik
  const ulpList = useMemo(() => {
    const set = new Set(allData.map(d => d.PARENT_LOCATION).filter(Boolean));
    return Array.from(set);
  }, [allData]);

  // Filter titik by ULP
  const filteredPoints = useMemo(() => {
    return allData
      .filter(d => !selectedULP || d.PARENT_LOCATION === selectedULP)
      .map(d => {
        const lat = Number(d.LATITUDEY);
        const lng = Number(d.LONGITUDEX);
        if (isNaN(lat) || isNaN(lng)) return null;
        return [lat, lng] as [number, number];
      })
      .filter((p): p is [number, number] => p !== null);
  }, [allData, selectedULP]);

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      {/* FILTER ULP */}
      <div
        style={{
          position: 'absolute',
          zIndex: 1000,
          background: 'white',
          padding: 10,
          borderRadius: 6,
          top: 10,
          left: 10
        }}
      >
        <select value={selectedULP} onChange={e => setSelectedULP(e.target.value)}>
          <option value="">Semua ULP</option>
          {ulpList.map((ulp, i) => (
            <option key={i} value={ulp}>{ulp}</option>
          ))}
        </select>
        <div style={{ fontSize: 12, marginTop: 5 }}>
          Total titik: {filteredPoints.length}
        </div>
      </div>

      {loading && (
        <div style={{ position: 'absolute', zIndex: 1000, top: 60, left: 10 }}>
          Loading data...
        </div>
      )}

      <MapContainer
        center={[-5.24, 119.49]}
        zoom={9}
        preferCanvas={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {filteredPoints.map((pos, i) => (
          <CircleMarker
            key={i}
            center={pos}
            radius={2}
            pathOptions={{ fillOpacity: 0.7 }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
