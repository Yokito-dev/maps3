"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then((m) => m.CircleMarker), {
  ssr: false,
});
const Tooltip = dynamic(() => import("react-leaflet").then((m) => m.Tooltip), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false });

const API_URL =
  "https://script.google.com/macros/s/AKfycbzepwwrEGzsTzMtJgccrjLrvKpNTptAzAXP_1E_wOhdOq-Zyx2gZ8NHYR98LGCDAKYw0w/exec";

type Point = {
  rowId: number;

  // ✅ kolom C (CXUNI)
  ulp: string;

  formattedAddress: string;
  streetAddress: string;
  city: string;
  owner: string;
  latitude: number;
  longitude: number;
};

type LatLng = [number, number]; // [lat, lng]
type Segment = [LatLng, LatLng]; // 1 segmen garis

function haversineKmLatLng(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

function segmentsTotalKm(segs: Segment[]) {
  let total = 0;
  for (const s of segs) {
    const a = { lat: s[0][0], lng: s[0][1] };
    const b = { lat: s[1][0], lng: s[1][1] };
    total += haversineKmLatLng(a, b);
  }
  return total;
}

function formatTitle(p: Point) {
  const addr = (p.formattedAddress || p.streetAddress || "").toString().trim();
  const ulp = (p.ulp || "-").toString().trim();
  const owner = (p.owner || "-").toString().trim();
  if (addr) return `${ulp} | ${owner} — ${addr}`;
  return `${ulp} | ${owner}`;
}

/** ---------- Union Find (Disjoint Set) ---------- */
class DSU {
  parent: number[];
  rank: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = Array(n).fill(0);
  }
  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }
  union(a: number, b: number): boolean {
    let ra = this.find(a);
    let rb = this.find(b);
    if (ra === rb) return false;
    if (this.rank[ra] < this.rank[rb]) [ra, rb] = [rb, ra];
    this.parent[rb] = ra;
    if (this.rank[ra] === this.rank[rb]) this.rank[ra]++;
    return true;
  }
}

/**
 * Build "sebisa mungkin nyambung" per ULP:
 * - bikin kandidat edge pakai k-nearest (grid biar cepat)
 * - lalu Kruskal -> MST
 * - putus kalau edge > cutoffMeters
 */
function buildMSTSegments(points: Point[], cutoffMeters: number, kNearest = 6): Segment[] {
  const n = points.length;
  if (n < 2) return [];

  // planar projection (meter)
  const lat0 = points.reduce((s, p) => s + p.latitude, 0) / n;
  const lat0Rad = (lat0 * Math.PI) / 180;
  const mPerDegLat = 110574;
  const mPerDegLng = 111320 * Math.cos(lat0Rad);

  const xs = new Array<number>(n);
  const ys = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    xs[i] = points[i].longitude * mPerDegLng;
    ys[i] = points[i].latitude * mPerDegLat;
  }

  // grid index
  const cell = Math.max(300, Math.min(800, Math.floor(cutoffMeters / 3)));
  const key = (cx: number, cy: number) => `${cx}|${cy}`;

  const grid = new Map<string, number[]>();
  for (let i = 0; i < n; i++) {
    const cx = Math.floor(xs[i] / cell);
    const cy = Math.floor(ys[i] / cell);
    const k = key(cx, cy);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k)!.push(i);
  }

  type Edge = { i: number; j: number; d: number };
  const edges: Edge[] = [];
  const seen = new Set<string>();

  const rCells = Math.max(1, Math.ceil(cutoffMeters / cell));

  for (let i = 0; i < n; i++) {
    const cx = Math.floor(xs[i] / cell);
    const cy = Math.floor(ys[i] / cell);

    const candidates: { j: number; d: number }[] = [];

    for (let dx = -rCells; dx <= rCells; dx++) {
      for (let dy = -rCells; dy <= rCells; dy++) {
        const cand = grid.get(key(cx + dx, cy + dy));
        if (!cand) continue;

        for (const j of cand) {
          if (j === i) continue;
          const d = Math.hypot(xs[j] - xs[i], ys[j] - ys[i]); // meters
          if (d <= cutoffMeters) candidates.push({ j, d });
        }
      }
    }

    if (!candidates.length) continue;

    candidates.sort((a, b) => a.d - b.d);
    const take = candidates.slice(0, Math.min(kNearest, candidates.length));

    for (const c of take) {
      const a = i < c.j ? i : c.j;
      const b = i < c.j ? c.j : i;
      const k2 = `${a}-${b}`;
      if (seen.has(k2)) continue;
      seen.add(k2);
      edges.push({ i: a, j: b, d: c.d });
    }
  }

  if (!edges.length) return [];

  edges.sort((a, b) => a.d - b.d);
  const dsu = new DSU(n);

  const segs: Segment[] = [];
  for (const e of edges) {
    if (dsu.union(e.i, e.j)) {
      segs.push([
        [points[e.i].latitude, points[e.i].longitude],
        [points[e.j].latitude, points[e.j].longitude],
      ]);
    }
  }

  return segs;
}

/**
 * AUTO cutoff: ambil p95 jarak tetangga terdekat lalu kali multiplier
 * => definisi "jauh banget"
 */
function nearestNeighborMeters(points: Point[]): number[] {
  const n = points.length;
  if (n < 2) return [];

  const lat0 = points.reduce((s, p) => s + p.latitude, 0) / n;
  const lat0Rad = (lat0 * Math.PI) / 180;

  const mPerDegLat = 110574;
  const mPerDegLng = 111320 * Math.cos(lat0Rad);

  const xs = points.map((p) => p.longitude * mPerDegLng);
  const ys = points.map((p) => p.latitude * mPerDegLat);

  const cell = 500;
  const key = (cx: number, cy: number) => `${cx}|${cy}`;

  const grid = new Map<string, number[]>();
  for (let i = 0; i < n; i++) {
    const cx = Math.floor(xs[i] / cell);
    const cy = Math.floor(ys[i] / cell);
    const k = key(cx, cy);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k)!.push(i);
  }

  const dists: number[] = [];
  for (let i = 0; i < n; i++) {
    const cx = Math.floor(xs[i] / cell);
    const cy = Math.floor(ys[i] / cell);

    let best = Infinity;

    for (let r = 0; r <= 10; r++) {
      let foundAny = false;

      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          const cand = grid.get(key(cx + dx, cy + dy));
          if (!cand) continue;

          for (const j of cand) {
            if (j === i) continue;
            const d = Math.hypot(xs[j] - xs[i], ys[j] - ys[i]);
            if (d < best) best = d;
            foundAny = true;
          }
        }
      }

      if (foundAny && best < Infinity) break;
    }

    if (best < Infinity) dists.push(best);
  }

  return dists;
}

function percentile(arr: number[], p: number) {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const idx = Math.floor((a.length - 1) * p);
  return a[idx];
}

export default function MapsPage() {
  const [mounted, setMounted] = useState(false);

  const [map, setMap] = useState<LeafletMap | null>(null);
  const [allData, setAllData] = useState<Point[]>([]);

  const [selectedUlp, setSelectedUlp] = useState("");
  const [selectedBase, setSelectedBase] = useState<"normal" | "satellite">("normal");
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);

  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // ====== MODE UKUR ======
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<Point[]>([]);
  const [airKm, setAirKm] = useState<number | null>(null);

  const [roadLoading, setRoadLoading] = useState(false);
  const [roadErr, setRoadErr] = useState("");
  const [roadKm, setRoadKm] = useState<number | null>(null);
  const [roadLine, setRoadLine] = useState<LatLng[]>([]);

  // ====== GARIS ULP ======
  const [showUlpLines, setShowUlpLines] = useState(true);
  const [autoCutoff, setAutoCutoff] = useState(true);
  const [cutoffMetersManual, setCutoffMetersManual] = useState(8000);

  useEffect(() => setMounted(true), []);

  async function loadData() {
    try {
      setLoading(true);
      setErrMsg("");
      const res = await fetch(API_URL);
      const json = await res.json();

      if (!Array.isArray(json)) {
        setAllData([]);
        setErrMsg("Response API bukan array. Cek Apps Script.");
        return;
      }

      setAllData(json);
    } catch (e: any) {
      setAllData([]);
      setErrMsg(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ulpList = useMemo(() => {
    return Array.from(new Set(allData.map((d) => d.ulp))).filter(Boolean).sort();
  }, [allData]);

  const points = useMemo(() => {
    return allData.filter(
      (d) =>
        !Number.isNaN(d.latitude) &&
        !Number.isNaN(d.longitude) &&
        (!selectedUlp || d.ulp === selectedUlp)
    );
  }, [allData, selectedUlp]);

  useEffect(() => {
    if (!map) return;
    if (!points.length) return;
    const bounds = points.map((p) => [p.latitude, p.longitude] as LatLng);
    map.fitBounds(bounds as any, { padding: [30, 30] });
  }, [map, points]);

  useEffect(() => {
    setSelectedPoint(null);
    setMeasurePoints([]);
    setAirKm(null);
    setRoadKm(null);
    setRoadLine([]);
    setRoadErr("");
  }, [selectedUlp]);

  function resetMeasure() {
    setMeasurePoints([]);
    setAirKm(null);
    setRoadKm(null);
    setRoadLine([]);
    setRoadErr("");
  }

  function undoMeasure() {
    setMeasurePoints((prev) => prev.slice(0, -1));
  }

  useEffect(() => {
    if (measurePoints.length < 2) {
      setAirKm(null);
      return;
    }
    let total = 0;
    for (let i = 1; i < measurePoints.length; i++) {
      total += haversineKmLatLng(
        { lat: measurePoints[i - 1].latitude, lng: measurePoints[i - 1].longitude },
        { lat: measurePoints[i].latitude, lng: measurePoints[i].longitude }
      );
    }
    setAirKm(total);
  }, [measurePoints]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchRoute() {
      if (measurePoints.length < 2) {
        setRoadKm(null);
        setRoadLine([]);
        setRoadErr("");
        return;
      }

      if (measurePoints.length > 20) {
        setRoadErr("Titik terlalu banyak (max 20 untuk routing jalan). Kurangi titik dulu ya.");
        setRoadKm(null);
        setRoadLine([]);
        return;
      }

      setRoadLoading(true);
      setRoadErr("");

      try {
        const coordStr = measurePoints.map((p) => `${p.longitude},${p.latitude}`).join(";");
        const url =
          `https://router.project-osrm.org/route/v1/driving/${coordStr}` +
          `?overview=full&geometries=geojson`;

        const res = await fetch(url, { signal: controller.signal });
        const json = await res.json();

        if (!json?.routes?.[0]) {
          setRoadErr("Route jalan tidak ditemukan (OSRM).");
          setRoadKm(null);
          setRoadLine([]);
          return;
        }

        setRoadKm(json.routes[0].distance / 1000);

        const coords = json.routes[0].geometry?.coordinates || [];
        const latlngs: LatLng[] = coords.map((c: number[]) => [c[1], c[0]]);
        setRoadLine(latlngs);

        if (map && latlngs.length > 1) {
          map.fitBounds(latlngs as any, { padding: [30, 30] });
        }
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setRoadErr("Gagal ambil route jalan: " + String(e?.message || e));
        setRoadKm(null);
        setRoadLine([]);
      } finally {
        setRoadLoading(false);
      }
    }

    fetchRoute();
    return () => controller.abort();
  }, [measurePoints, map]);

  async function handleDelete() {
    if (!selectedPoint) return;
    if (!confirm("Yakin ingin menghapus titik ini?")) return;

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "delete",
        rowId: selectedPoint.rowId,
      }),
    });

    const json = await res.json();

    if (json?.success) {
      setAllData((prev) => prev.filter((p) => p.rowId !== selectedPoint.rowId));
      setSelectedPoint(null);
      setMeasurePoints((prev) => prev.filter((p) => p.rowId !== selectedPoint.rowId));
    } else {
      alert("Gagal hapus: " + (json?.message || ""));
    }
  }

  const cutoffMetersAuto = useMemo(() => {
    const samplePoints = points.length > 6000 ? points.slice(0, 6000) : points;

    const nn = nearestNeighborMeters(samplePoints);
    if (nn.length < 50) return cutoffMetersManual;

    const p95 = percentile(nn, 0.95);
    const thr = Math.round(p95 * 8);

    return Math.min(30000, Math.max(2000, thr));
  }, [points, cutoffMetersManual]);

  const effectiveCutoffMeters = autoCutoff ? cutoffMetersAuto : cutoffMetersManual;

  // ✅ garis ULP + total km
  const ulpLineInfo = useMemo(() => {
    if (!showUlpLines) return { notice: "", segments: [] as Segment[], totalKm: 0 };

    if (!selectedUlp && points.length > 3500) {
      return {
        notice: "Titik terlalu banyak untuk gambar garis semua ULP. Pilih 1 ULP dulu ya.",
        segments: [] as Segment[],
        totalKm: 0,
      };
    }

    const segments: Segment[] = [];

    if (selectedUlp) {
      segments.push(...buildMSTSegments(points, effectiveCutoffMeters, 6));
    } else {
      const byUlp = new Map<string, Point[]>();
      for (const p of points) {
        const k = (p.ulp || "").toString();
        if (!k) continue;
        if (!byUlp.has(k)) byUlp.set(k, []);
        byUlp.get(k)!.push(p);
      }
      for (const arr of byUlp.values()) {
        if (arr.length < 2) continue;
        segments.push(...buildMSTSegments(arr, effectiveCutoffMeters, 6));
      }
    }

    const totalKm = segmentsTotalKm(segments);
    return { notice: "", segments, totalKm };
  }, [showUlpLines, selectedUlp, points, effectiveCutoffMeters]);

  if (!mounted) return null;

  const straightLinePositions: LatLng[] =
    measurePoints.length >= 2 ? measurePoints.map((p) => [p.latitude, p.longitude]) : [];

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
          borderRadius: 8,
          width: 390,
          boxShadow: "0px 2px 10px rgba(0,0,0,0.2)",
          fontSize: 13,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <b>Filter Pemeliharaan</b>
          <button
            onClick={loadData}
            style={{
              border: "1px solid #ddd",
              borderRadius: 6,
              padding: "4px 8px",
              cursor: "pointer",
              background: "white",
            }}
          >
            Refresh
          </button>
        </div>

        <div style={{ marginTop: 8, fontSize: 12, color: "#444" }}>
          Total: <b>{allData.length}</b> | Tampil: <b>{points.length}</b>
          {loading ? " | loading..." : ""}
          {errMsg ? <div style={{ color: "#d32f2f", marginTop: 6 }}>{errMsg}</div> : null}
        </div>

        {/* FILTER ULP */}
        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>ULP (kolom C / CXUNI)</div>
          <select
            value={selectedUlp}
            onChange={(e) => setSelectedUlp(e.target.value)}
            style={{ width: "100%", padding: 6 }}
          >
            <option value="">Semua</option>
            {ulpList.map((u, i) => (
              <option key={i} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        {/* BASE MAP */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Base Map</div>
          <select
            value={selectedBase}
            onChange={(e) => setSelectedBase(e.target.value as any)}
            style={{ width: "100%", padding: 6 }}
          >
            <option value="normal">Normal</option>
            <option value="satellite">Satellite</option>
          </select>
        </div>

        {/* GARIS ULP */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #eee" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <b>Garis ULP (auto nyambung)</b>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={showUlpLines}
                onChange={(e) => setShowUlpLines(e.target.checked)}
              />
              tampilkan
            </label>
          </div>

          <div style={{ marginTop: 6, fontSize: 12, color: "#555" }}>
            Putus cuma kalau jaraknya udah jauh banget.
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={autoCutoff}
                onChange={(e) => setAutoCutoff(e.target.checked)}
              />
              Auto batas putus
            </label>
            <div style={{ marginLeft: "auto", fontSize: 12, color: "#444" }}>
              cutoff: <b>{effectiveCutoffMeters} m</b>
            </div>
          </div>

          {!autoCutoff && (
            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
              <div style={{ width: 170 }}>Putus jika &gt; (m)</div>
              <input
                type="number"
                value={cutoffMetersManual}
                min={500}
                max={30000}
                onChange={(e) => setCutoffMetersManual(Number(e.target.value || 0))}
                style={{ flex: 1, padding: 6, border: "1px solid #ddd", borderRadius: 6 }}
              />
            </div>
          )}

          {ulpLineInfo.notice ? (
            <div style={{ color: "#d32f2f", marginTop: 8 }}>{ulpLineInfo.notice}</div>
          ) : (
            <div style={{ marginTop: 8, fontSize: 12, color: "#555" }}>
              Segmen: <b>{ulpLineInfo.segments.length}</b> | Total garis:{" "}
              <b>{ulpLineInfo.totalKm.toFixed(3)} km</b>
            </div>
          )}
        </div>

        {/* UKUR JARAK */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #eee" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <b>Ukur Jarak</b>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={measureMode}
                onChange={(e) => {
                  setMeasureMode(e.target.checked);
                  setSelectedPoint(null);
                  resetMeasure();
                }}
              />
              Mode ukur
            </label>
          </div>

          <div style={{ marginTop: 6, fontSize: 12, color: "#555" }}>
            {measureMode
              ? "Klik marker untuk menambah titik (klik lagi untuk hapus)."
              : "Aktifkan Mode ukur untuk pilih banyak tiang."}
          </div>

          {measureMode && (
            <div style={{ marginTop: 10, fontSize: 12 }}>
              <div>
                Titik dipilih: <b>{measurePoints.length}</b>
              </div>

              <div style={{ marginTop: 8 }}>
                <div>
                  <b>Total lurus:</b> {airKm != null ? `${airKm.toFixed(3)} km` : "-"}
                </div>
                <div>
                  <b>Total lewat jalan:</b>{" "}
                  {roadLoading ? "loading..." : roadKm != null ? `${roadKm.toFixed(3)} km` : "-"}
                </div>
                {roadErr ? <div style={{ color: "#d32f2f", marginTop: 6 }}>{roadErr}</div> : null}
              </div>

              {measurePoints.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Daftar Titik</div>
                  <div
                    style={{
                      maxHeight: 140,
                      overflow: "auto",
                      border: "1px solid #eee",
                      borderRadius: 6,
                      padding: 8,
                    }}
                  >
                    {measurePoints.map((p, idx) => (
                      <div
                        key={p.rowId}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 8,
                          padding: "6px 0",
                          borderBottom:
                            idx === measurePoints.length - 1 ? "none" : "1px dashed #eee",
                        }}
                      >
                        <div style={{ lineHeight: 1.2 }}>
                          <b>Titik {idx + 1}:</b> {formatTitle(p)}
                        </div>
                        <button
                          onClick={() =>
                            setMeasurePoints((prev) => prev.filter((x) => x.rowId !== p.rowId))
                          }
                          style={{
                            border: "1px solid #ddd",
                            background: "white",
                            borderRadius: 6,
                            padding: "2px 8px",
                            cursor: "pointer",
                            height: 26,
                          }}
                          title="Hapus titik ini"
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  onClick={() => undoMeasure()}
                  disabled={measurePoints.length === 0}
                  style={{
                    flex: 1,
                    border: "1px solid #ddd",
                    background: "white",
                    borderRadius: 6,
                    padding: "8px 10px",
                    cursor: measurePoints.length === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  Undo terakhir
                </button>
                <button
                  onClick={() => resetMeasure()}
                  style={{
                    flex: 1,
                    border: "1px solid #ddd",
                    background: "white",
                    borderRadius: 6,
                    padding: "8px 10px",
                    cursor: "pointer",
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>

        {/* DETAIL SELECTED */}
        {!measureMode && selectedPoint && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Detail Titik</div>

            <div>
              <b>ULP:</b> {selectedPoint.ulp || "-"}
            </div>
            <div style={{ marginTop: 4 }}>
              <b>Owner:</b> {selectedPoint.owner || "-"}
            </div>

            <div style={{ marginTop: 6 }}>
              <b>Alamat:</b>
              <div>{selectedPoint.formattedAddress || "-"}</div>
              <div style={{ color: "#555" }}>
                {selectedPoint.streetAddress || "-"}{" "}
                {selectedPoint.city ? `(${selectedPoint.city})` : ""}
              </div>
            </div>

            <button
              onClick={handleDelete}
              style={{
                marginTop: 10,
                width: "100%",
                background: "#e53935",
                color: "white",
                border: "none",
                borderRadius: 6,
                padding: "8px 10px",
                cursor: "pointer",
              }}
            >
              Hapus titik
            </button>
          </div>
        )}
      </div>

      <MapContainer
        center={[-5.33, 119.41]}
        zoom={11}
        preferCanvas
        whenCreated={setMap}
        style={{ height: "100%", width: "100%" }}
      >
        {selectedBase === "normal" ? (
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        ) : (
          <TileLayer url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" />
        )}

        {/* GARIS ULP */}
        {ulpLineInfo.segments.length > 0 && (
          <Polyline
            positions={ulpLineInfo.segments as any}
            pathOptions={{ color: "#444", weight: 2, opacity: 0.65 }}
          />
        )}

        {/* GARIS UKUR */}
        {straightLinePositions.length > 1 && (
          <Polyline
            positions={straightLinePositions}
            pathOptions={{ color: "#111", weight: 2, dashArray: "6 8" }}
          />
        )}

        {roadLine.length > 1 && (
          <Polyline positions={roadLine} pathOptions={{ color: "#d32f2f", weight: 4, opacity: 0.9 }} />
        )}

        {points.map((d) => {
          const selected = selectedPoint?.rowId === d.rowId;
          const idxInMeasure = measurePoints.findIndex((p) => p.rowId === d.rowId);
          const isInMeasure = idxInMeasure !== -1;

          const isStart = isInMeasure && idxInMeasure === 0;
          const isEnd = isInMeasure && idxInMeasure === measurePoints.length - 1;

          const radius = isInMeasure ? 7 : selected ? 6 : 4;

          const strokeColor = isStart
            ? "#2e7d32"
            : isEnd
            ? "#6a1b9a"
            : isInMeasure
            ? "#ef6c00"
            : selected
            ? "#1565c0"
            : "#1976d2";

          const fillColor = isStart
            ? "#66bb6a"
            : isEnd
            ? "#ba68c8"
            : isInMeasure
            ? "#ffb74d"
            : selected
            ? "#ff9800"
            : "#2196f3";

          return (
            <CircleMarker
              key={d.rowId}
              center={[d.latitude, d.longitude]}
              radius={radius}
              pathOptions={{
                color: strokeColor,
                weight: 1,
                fillColor: fillColor,
                fillOpacity: 0.9,
              }}
              eventHandlers={{
                click: () => {
                  if (measureMode) {
                    setMeasurePoints((prev) => {
                      const exists = prev.some((p) => p.rowId === d.rowId);
                      if (exists) return prev.filter((p) => p.rowId !== d.rowId);
                      return [...prev, d];
                    });
                  } else {
                    setSelectedPoint(d);
                  }
                },
              }}
            >
              <Tooltip>
                <div style={{ fontSize: 12 }}>
                  <b>{d.ulp || "-"}</b> | {d.owner || "-"}
                  <br />
                  {d.formattedAddress || "-"}
                  {isInMeasure ? (
                    <div style={{ marginTop: 4 }}>
                      <b>Titik {idxInMeasure + 1}</b>
                    </div>
                  ) : null}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
