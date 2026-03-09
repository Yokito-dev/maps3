"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";
import { useMap } from "react-leaflet";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then((m) => m.CircleMarker), { ssr: false });
const Tooltip = dynamic(() => import("react-leaflet").then((m) => m.Tooltip), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false });
const Circle = dynamic(() => import("react-leaflet").then((m) => m.Circle), { ssr: false });

const API_URL =
  "https://script.google.com/macros/s/AKfycbwchchEzqRbtHKzCZh7nL0QnhPKUWN3aI3DvV9Hp8SbkCESLnaRBGeFdRUQzGe7eetO/exec?tab=GI";

type P = {
  tab: string;
  up3: string;
  latitude: number;
  longitude: number;

  count: number;
  rowIds: number[];
  titikLokasiList: string[];
  tipeKeypointList: string[];
  statusList: string[];

  lokasiText: string;
  lokasiUrl: string;
};

type LatLng = [number, number];

type Edge = {
  a: LatLng;
  b: LatLng;
  meters: number;
};

function MapSetter({ onReady }: { onReady: (m: LeafletMap) => void }) {
  const map = useMap();
  useEffect(() => onReady(map), [map, onReady]);
  return null;
}

function loadJsonp<T>(url: string, timeoutMs = 20000): Promise<T> {
  return new Promise((resolve, reject) => {
    const cbName = `__jsonp_cb_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
    const script = document.createElement("script");
    script.async = true;

    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("JSONP timeout"));
    }, timeoutMs);

    function cleanup() {
      window.clearTimeout(timer);
      // @ts-ignore
      delete (window as any)[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    // @ts-ignore
    (window as any)[cbName] = (data: T) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("JSONP script load error"));
    };

    const sep = url.includes("?") ? "&" : "?";
    script.src = `${url}${sep}callback=${encodeURIComponent(cbName)}&t=${Date.now()}`;
    document.body.appendChild(script);
  });
}

/* ================= DISTANCE HELPERS ================= */

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatKm(meters: number) {
  return `${(meters / 1000).toFixed(3)} km`;
}

function buildSequentialEdges(points: P[]): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const aP = points[i];
    const bP = points[i + 1];
    const meters = haversineMeters(
      { lat: aP.latitude, lng: aP.longitude },
      { lat: bP.latitude, lng: bP.longitude }
    );
    edges.push({
      a: [aP.latitude, aP.longitude],
      b: [bP.latitude, bP.longitude],
      meters,
    });
  }
  return edges;
}

export default function PetaMakassarSelatanDedup() {
  const [mounted, setMounted] = useState(false);
  const [map, setMap] = useState<LeafletMap | null>(null);

  const [base, setBase] = useState<"normal" | "satellite">("normal");
  const [data, setData] = useState<P[]>([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const [showLines, setShowLines] = useState(true);

  // ✅ area radius (meter) — default lebih luas
  const [areaMeters, setAreaMeters] = useState(50); // ganti default sini kalau mau (misal 100 / 200)

  useEffect(() => setMounted(true), []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErrMsg("");

      const json = await loadJsonp<any>(API_URL);

      if (!Array.isArray(json)) {
        setData([]);
        setErrMsg(json?.error ? String(json.error) : "API tidak mengembalikan array");
        return;
      }

      setData(json as P[]);
    } catch (e: any) {
      setData([]);
      setErrMsg(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    load();
  }, [mounted, load]);

  const points = useMemo(
    () => data.filter((d) => Number.isFinite(d.latitude) && Number.isFinite(d.longitude)),
    [data]
  );

  useEffect(() => {
    if (!map) return;
    if (!points.length) return;
    const bounds = points.map((p) => [p.latitude, p.longitude] as LatLng);
    map.fitBounds(bounds as any, { padding: [30, 30] });
  }, [map, points]);

  const edges = useMemo(() => {
    if (!showLines) return [];
    if (points.length < 2) return [];
    if (points.length > 8000) return [];
    return buildSequentialEdges(points);
  }, [points, showLines]);

  const totalKm = useMemo(() => {
    if (!edges.length) return 0;
    const totalMeters = edges.reduce((s, e) => s + e.meters, 0);
    return totalMeters / 1000;
  }, [edges]);

  if (!mounted) return null;

  const safeAreaMeters = Math.max(1, Math.min(5000, Number(areaMeters) || 50)); // 1m..5000m

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      {/* PANEL */}
      <div
        style={{
          position: "absolute",
          zIndex: 1000,
          top: 20,
          right: 20,
          background: "white",
          padding: 12,
          borderRadius: 10,
          width: 380,
          boxShadow: "0px 2px 10px rgba(0,0,0,0.2)",
          fontSize: 13,
          maxHeight: "calc(100vh - 40px)",
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
          <b>GI - Makassar Selatan</b>
          <button
            onClick={load}
            style={{
              border: "1px solid #ddd",
              borderRadius: 6,
              padding: "6px 10px",
              cursor: "pointer",
              background: "white",
            }}
          >
            Refresh
          </button>
        </div>

        <div style={{ marginTop: 8, fontSize: 12, color: "#444" }}>
          Titik tampil: <b>{points.length}</b>
          {loading ? " | loading..." : ""}
          {errMsg ? <div style={{ color: "#d32f2f", marginTop: 6 }}>{errMsg}</div> : null}
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Base Map</div>
          <select value={base} onChange={(e) => setBase(e.target.value as any)} style={{ width: "100%", padding: 8 }}>
            <option value="normal">Normal</option>
            <option value="satellite">Satellite</option>
          </select>
        </div>

        {/* ✅ AREA SETTINGS */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #eee" }}>
          <b>Area dari Titik</b>
          <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 150, fontSize: 12, color: "#444" }}>Radius (meter)</div>
            <input
              type="number"
              min={1}
              max={5000}
              value={areaMeters}
              onChange={(e) => setAreaMeters(Number(e.target.value || 0))}
              style={{ flex: 1, padding: 8, border: "1px solid #ddd", borderRadius: 6 }}
            />
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: "#555" }}>
            Sekarang: <b>{safeAreaMeters} m</b>
          </div>

          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[5, 25, 50, 100, 200, 500].map((m) => (
              <button
                key={m}
                onClick={() => setAreaMeters(m)}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 999,
                  padding: "6px 10px",
                  background: "white",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>

        {/* GARIS */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #eee" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <b>Sambung Semua Tiang (KM)</b>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={showLines} onChange={(e) => setShowLines(e.target.checked)} />
              tampilkan
            </label>
          </div>

          <div style={{ marginTop: 8, fontSize: 12, color: "#555" }}>
            Segmen: <b>{edges.length}</b> | Total: <b>{totalKm.toFixed(3)} km</b>
          </div>

          {points.length > 8000 ? (
            <div style={{ color: "#d32f2f", marginTop: 8, fontSize: 12 }}>
              Titik terlalu banyak untuk menampilkan garis sambung semua.
            </div>
          ) : null}
        </div>
      </div>

      <MapContainer center={[-5.15, 119.41]} zoom={11} preferCanvas style={{ height: "100%", width: "100%" }}>
        <MapSetter onReady={setMap} />

        {base === "normal" ? (
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        ) : (
          <TileLayer url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" />
        )}

        {/* GARIS sambung semua (tooltip jarak KM per segmen) */}
        {showLines &&
          edges.map((e, idx) => (
            <Polyline
              key={`seg-${idx}-${e.a[0]}-${e.a[1]}-${e.b[0]}-${e.b[1]}`}
              positions={[e.a, e.b]}
              pathOptions={{ color: "#444", weight: 2, opacity: 0.65 }}
            >
              <Tooltip sticky>
                <div style={{ fontSize: 12 }}>
                  <b>Jarak:</b> {formatKm(e.meters)}
                </div>
              </Tooltip>
            </Polyline>
          ))}

        {/* MARKER + AREA */}
        {points.map((p) => {
          const key = `${p.latitude},${p.longitude}`;

          const titikLokasi1 = (p.titikLokasiList?.[0] || "-").toString();
          const tipe1 = (p.tipeKeypointList?.[0] || "-").toString();
          const status1 = (p.statusList?.[0] || "-").toString();

          return (
            <div key={key}>
              {/* ✅ AREA radius meter dari titik */}
              <Circle
                center={[p.latitude, p.longitude]}
                radius={safeAreaMeters} // meter
                pathOptions={{
                  color: "#1565c0",
                  weight: 1,
                  fillColor: "#1565c0",
                  fillOpacity: 0.10,
                  opacity: 0.65,
                }}
              />

              <CircleMarker
                center={[p.latitude, p.longitude]}
                radius={5}
                pathOptions={{ color: "#1565c0", weight: 1, fillColor: "#1565c0", fillOpacity: 0.85 }}
              >
                <Tooltip>
                  <div style={{ fontSize: 12 }}>
                    <b>Koordinat:</b> {p.latitude}, {p.longitude}
                    <br />
                    <b>Area:</b> radius {safeAreaMeters} m
                    <br />
                    <b>UP3:</b> {p.up3 || "-"}
                    <br />
                    <b>Titik Lokasi:</b> {titikLokasi1}
                    <br />
                    <b>Tipe:</b> {tipe1}
                    <br />
                    <b>Status:</b> {status1}
                  </div>
                </Tooltip>
              </CircleMarker>
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}