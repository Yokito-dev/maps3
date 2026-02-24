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

const API_URL = "https://script.google.com/macros/s/AKfycbwchchEzqRbtHKzCZh7nL0QnhPKUWN3aI3DvV9Hp8SbkCESLnaRBGeFdRUQzGe7eetO/exec?tab=GI";

type P = {
  tab: string;
  up3: string;
  latitude: number;
  longitude: number;

  count: number;               // ✅ jumlah yang digabung
  rowIds: number[];
  titikLokasiList: string[];
  tipeKeypointList: string[];
  statusList: string[];

  lokasiText: string;
  lokasiUrl: string;
};

type LatLng = [number, number];

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

export default function PetaMakassarSelatanDedup() {
  const [mounted, setMounted] = useState(false);
  const [map, setMap] = useState<LeafletMap | null>(null);

  const [base, setBase] = useState<"normal" | "satellite">("normal");
  const [data, setData] = useState<P[]>([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

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

  if (!mounted) return null;

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      <div style={{
        position: "absolute", zIndex: 1000, top: 20, right: 20,
        background: "white", padding: 12, borderRadius: 10, width: 380,
        boxShadow: "0px 2px 10px rgba(0,0,0,0.2)", fontSize: 13,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
          <b>GI - Makassar Selatan (Dedup Koordinat)</b>
          <button onClick={load} style={{ border: "1px solid #ddd", borderRadius: 6, padding: "6px 10px", cursor: "pointer", background: "white" }}>
            Refresh
          </button>
        </div>

        <div style={{ marginTop: 8, fontSize: 12, color: "#444" }}>
          Titik unik: <b>{points.length}</b>
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
      </div>

      <MapContainer center={[-5.15, 119.41]} zoom={11} preferCanvas style={{ height: "100%", width: "100%" }}>
        <MapSetter onReady={setMap} />

        {base === "normal" ? (
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        ) : (
          <TileLayer url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" />
        )}

        {points.map((p) => {
          // radius makin besar kalau banyak yang digabung
          const radius = Math.min(12, 4 + Math.log2(Math.max(1, p.count)));

          return (
            <CircleMarker
              key={`${p.latitude},${p.longitude}`}
              center={[p.latitude, p.longitude]}
              radius={radius}
              pathOptions={{ color: "#1565c0", weight: 1, fillColor: "#1565c0", fillOpacity: 0.85 }}
            >
              <Tooltip>
                <div style={{ fontSize: 12 }}>
                  <b>Koordinat:</b> {p.latitude}, {p.longitude}<br />
                  <b>Jumlah digabung:</b> {p.count}<br />
                  <b>UP3:</b> {p.up3 || "-"}<br />
                  <b>Titik Lokasi:</b> {p.titikLokasiList.slice(0, 5).join(" | ")}
                  {p.titikLokasiList.length > 5 ? " ..." : ""}<br />
                  <b>Tipe:</b> {p.tipeKeypointList.join(" | ") || "-"}<br />
                  <b>Status:</b> {p.statusList.join(" | ") || "-"}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}