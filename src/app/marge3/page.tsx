"use client";

import dynamic from "next/dynamic";

const GAS_URL =
  "https://script.google.com/macros/s/AKfycbwchchEzqRbtHKzCZh7nL0QnhPKUWN3aI3DvV9Hp8SbkCESLnaRBGeFdRUQzGe7eetO/exec";
const UP3 = "MAKASSAR SELATAN";

// OSRM demo server (tanpa key)
const OSRM_BASE = "https://router.project-osrm.org";
const OSRM_PROFILE: "driving" | "cycling" | "walking" = "driving";

const BOX_SIZE_METERS = 60;
const MAX_POINTS_FOR_LINES = 250;

type Item = { keypoint: string; ulp: string; status: string };
type Point = {
  kategori: "GH" | "LBS" | "REC" | string;
  up3: string;
  latitude: number;
  longitude: number;
  count: number;
  items: Item[];
};

type Sel = {
  key: string;
  kategori: string;
  lat: number;
  lng: number;
  label: string;
};

function ensureLeafletCss() {
  if (typeof document === "undefined") return;
  const id = "leaflet-css-cdn";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(link);
}

// JSONP biar no CORS (tetap 1 file)
function jsonp<T>(url: string, timeoutMs = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const cbName = `__jsonp_cb_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const script = document.createElement("script");

    (window as any)[cbName] = (data: T) => {
      cleanup();
      resolve(data);
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("JSONP timeout"));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      if ((window as any)[cbName]) delete (window as any)[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    const sep = url.includes("?") ? "&" : "?";
    script.src = `${url}${sep}mode=merge3&up3=${encodeURIComponent(UP3)}&callback=${cbName}`;
    script.onerror = () => {
      cleanup();
      reject(new Error("JSONP load error"));
    };

    document.body.appendChild(script);
  });
}

function metersToDeltaLat(m: number) {
  return m / 111_320;
}
function metersToDeltaLng(m: number, lat: number) {
  const rad = (lat * Math.PI) / 180;
  const metersPerDeg = 111_320 * Math.cos(rad);
  return metersPerDeg ? m / metersPerDeg : m / 111_320;
}

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
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

// ✅ selalu KM
function fmtKm(meters: number) {
  const km = meters / 1000;
  const dec = km >= 1 ? 2 : 3;
  return `${km.toFixed(dec)} km`;
}

function fmtMin(seconds: number) {
  const min = seconds / 60;
  if (min < 60) return `${Math.round(min)} menit`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h} jam ${m} m`;
}

// MST (Prim) per kategori (berdasarkan jarak lurus)
function buildMstEdges(points: { lat: number; lng: number }[]) {
  const n = points.length;
  if (n <= 1) return [];

  const inTree = new Array(n).fill(false);
  const minDist = new Array(n).fill(Infinity);
  const parent = new Array(n).fill(-1);

  inTree[0] = true;
  for (let i = 1; i < n; i++) {
    minDist[i] = haversineMeters(points[0], points[i]);
    parent[i] = 0;
  }

  const edges: { a: number; b: number; dist: number }[] = [];

  for (let step = 0; step < n - 1; step++) {
    let v = -1;
    let best = Infinity;
    for (let i = 0; i < n; i++) {
      if (!inTree[i] && minDist[i] < best) {
        best = minDist[i];
        v = i;
      }
    }
    if (v === -1) break;

    inTree[v] = true;
    edges.push({ a: parent[v], b: v, dist: best });

    for (let u = 0; u < n; u++) {
      if (!inTree[u]) {
        const d = haversineMeters(points[v], points[u]);
        if (d < minDist[u]) {
          minDist[u] = d;
          parent[u] = v;
        }
      }
    }
  }
  return edges;
}

/**
 * ✅ Leaflet/react-leaflet diimport hanya di CLIENT
 */
const ClientOnlyMap = dynamic(
  async () => {
    const React = await import("react");
    const { MapContainer, TileLayer, CircleMarker, Tooltip, Rectangle, Polyline } =
      await import("react-leaflet");

    const { useEffect, useMemo, useRef, useState } = React;

    return function MapPage() {
      const [points, setPoints] = useState<Point[]>([]);
      const [selA, setSelA] = useState<Sel | null>(null);
      const [selB, setSelB] = useState<Sel | null>(null);

      // jarak jalan (OSRM)
      const [roadMeters, setRoadMeters] = useState<number | null>(null);
      const [roadSeconds, setRoadSeconds] = useState<number | null>(null);
      const [roadRoute, setRoadRoute] = useState<[number, number][] | null>(null);
      const [roadLoading, setRoadLoading] = useState(false);
      const [roadError, setRoadError] = useState<string | null>(null);

      const osrmCacheRef = useRef(
        new Map<string, { meters: number; seconds: number; coords: [number, number][] | null }>()
      );
      const lastReqRef = useRef<number>(0);
      const abortRef = useRef<AbortController | null>(null);

      useEffect(() => {
        ensureLeafletCss();
        jsonp<Point[]>(GAS_URL)
          .then(setPoints)
          .catch((e) => {
            console.error(e);
            setPoints([]);
          });
      }, []);

      const colorByKategori: Record<string, string> = {
        GH: "#ff4fa3",
        LBS: "#1f77b4",
        REC: "#2ca02c",
      };

      const center = useMemo<[number, number]>(() => {
        if (!points.length) return [-5.1477, 119.4327];
        return [points[0].latitude, points[0].longitude];
      }, [points]);

      const counts = useMemo(() => {
        const c: Record<string, number> = {};
        for (const p of points) c[p.kategori] = (c[p.kategori] || 0) + 1;
        return c;
      }, [points]);

      const pointToSel = (p: Point, idx: number): Sel => {
        const first = p.items?.[0];
        const base = first?.keypoint ? first.keypoint : `${p.kategori}#${idx + 1}`;
        const label = p.items?.length > 1 ? `${base} (+${p.items.length - 1})` : base;
        return {
          key: `${p.kategori}-${p.latitude}-${p.longitude}-${idx}`,
          kategori: p.kategori || "OTHER",
          lat: p.latitude,
          lng: p.longitude,
          label,
        };
      };

      const grouped = useMemo(() => {
        const g: Record<string, { lat: number; lng: number; label: string; refKey: string }[]> =
          {};
        for (let i = 0; i < points.length; i++) {
          const p = points[i];
          const k = p.kategori || "OTHER";
          if (!g[k]) g[k] = [];
          const sel = pointToSel(p, i);
          g[k].push({ lat: sel.lat, lng: sel.lng, label: sel.label, refKey: sel.key });
        }
        return g;
      }, [points]);

      const mstByKategori = useMemo(() => {
        const out: Record<string, { a: number; b: number; dist: number }[]> = {};
        for (const k of Object.keys(grouped)) {
          const arr = grouped[k];
          if (!arr || arr.length <= 1) continue;
          if (arr.length > MAX_POINTS_FOR_LINES) {
            out[k] = [];
            continue;
          }
          out[k] = buildMstEdges(arr);
        }
        return out;
      }, [grouped]);

      const rataRataByKategori = useMemo(() => {
        const out: Record<string, number | null> = {};
        for (const k of Object.keys(grouped)) {
          const edges = mstByKategori[k] || [];
          if (!edges.length) {
            out[k] = null;
            continue;
          }
          const sum = edges.reduce((acc, e) => acc + e.dist, 0);
          out[k] = sum / edges.length;
        }
        return out;
      }, [grouped, mstByKategori]);

      const lurusMeters = useMemo(() => {
        if (!selA || !selB) return null;
        return haversineMeters({ lat: selA.lat, lng: selA.lng }, { lat: selB.lat, lng: selB.lng });
      }, [selA, selB]);

      const onPick = (s: Sel) => {
        if (!selA) return setSelA(s);
        if (!selB) return setSelB(s);
        setSelA(s);
        setSelB(null);
      };

      const resetPick = () => {
        setSelA(null);
        setSelB(null);
        setRoadMeters(null);
        setRoadSeconds(null);
        setRoadRoute(null);
        setRoadError(null);
        setRoadLoading(false);
        if (abortRef.current) abortRef.current.abort();
      };

      // ===== OSRM =====
      const buildOsrmKey = (a: Sel, b: Sel) => {
        const k1 = `${a.lng.toFixed(6)},${a.lat.toFixed(6)}`;
        const k2 = `${b.lng.toFixed(6)},${b.lat.toFixed(6)}`;
        return k1 < k2 ? `${k1}|${k2}|${OSRM_PROFILE}` : `${k2}|${k1}|${OSRM_PROFILE}`;
      };

      const fetchRoad = async (a: Sel, b: Sel) => {
        const key = buildOsrmKey(a, b);
        const cached = osrmCacheRef.current.get(key);
        if (cached) return cached;

        const now = Date.now();
        const delta = now - lastReqRef.current;
        if (delta < 1000) await new Promise((r) => setTimeout(r, 1000 - delta));
        lastReqRef.current = Date.now();

        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        const url = `${OSRM_BASE}/route/v1/${OSRM_PROFILE}/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson&steps=false&alternatives=false`;

        const resp = await fetch(url, { signal: abortRef.current.signal });
        if (!resp.ok) throw new Error(`OSRM HTTP ${resp.status}`);

        const json = await resp.json();
        if (!json?.routes?.[0]) throw new Error("OSRM: routes kosong");

        const meters = Number(json.routes[0].distance);
        const seconds = Number(json.routes[0].duration);

        let coords: [number, number][] | null = null;
        const geom = json.routes[0]?.geometry?.coordinates;
        if (Array.isArray(geom) && geom.length) {
          coords = geom.map((c: [number, number]) => [c[1], c[0]]);
        }

        const out = { meters, seconds, coords };
        osrmCacheRef.current.set(key, out);
        return out;
      };

      useEffect(() => {
        (async () => {
          if (!selA || !selB) {
            setRoadMeters(null);
            setRoadSeconds(null);
            setRoadRoute(null);
            setRoadError(null);
            setRoadLoading(false);
            return;
          }

          setRoadLoading(true);
          setRoadError(null);

          try {
            const r = await fetchRoad(selA, selB);
            setRoadMeters(r.meters);
            setRoadSeconds(r.seconds);
            setRoadRoute(r.coords);
          } catch (e: any) {
            setRoadMeters(null);
            setRoadSeconds(null);
            setRoadRoute(null);
            setRoadError(String(e?.message || e));
          } finally {
            setRoadLoading(false);
          }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [selA?.key, selB?.key]);

      return (
        <div style={{ height: "100vh", width: "100%", position: "relative" }}>
          {/* ✅ kotak putih kanan atas (lebih lebar) */}
          <div
            style={{
              position: "absolute",
              right: 12,
              top: 12,
              zIndex: 9999,
              background: "white",
              borderRadius: 10,
              padding: "12px 14px",
              boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
              width: 380,
              maxWidth: "calc(100vw - 24px)",
              fontSize: 13,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Ringkasan Titik</div>
            <div style={{ opacity: 0.8, marginBottom: 10 }}>{UP3}</div>

            {Object.keys(counts)
              .sort()
              .map((k) => (
                <div
                  key={k}
                  style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: colorByKategori[k] || "#666",
                      display: "inline-block",
                    }}
                  />
                  <span style={{ flex: 1 }}>{k}</span>
                  <b>{counts[k]}</b>
                </div>
              ))}

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
              <b>Rata-rata</b> jarak (lurus/MST):
            </div>
            {Object.keys(counts)
              .sort()
              .map((k) => (
                <div
                  key={`avg-${k}`}
                  style={{ display: "flex", gap: 10, fontSize: 12, marginTop: 4 }}
                >
                  <span style={{ width: 46, opacity: 0.8 }}>{k}</span>
                  <span style={{ opacity: 0.9 }}>
                    {rataRataByKategori[k] == null ? "-" : fmtKm(rataRataByKategori[k] as number)}
                  </span>
                </div>
              ))}

            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #eee" }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Jarak Titik</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>
                A: {selA ? `${selA.kategori} • ${selA.label}` : "-"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
                B: {selB ? `${selB.kategori} • ${selB.label}` : "-"}
              </div>

              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.9 }}>
                <div>
                  <b>Jarak lurus:</b> {lurusMeters == null ? "-" : fmtKm(lurusMeters)}
                </div>
                <div style={{ marginTop: 6 }}>
                  <b>Jarak jalan:</b>{" "}
                  {selA && selB ? (
                    roadLoading ? (
                      "menghitung…"
                    ) : roadMeters != null ? (
                      <>
                        {fmtKm(roadMeters)}
                        {roadSeconds != null ? ` • ${fmtMin(roadSeconds)}` : ""}
                      </>
                    ) : (
                      "-"
                    )
                  ) : (
                    "-"
                  )}
                </div>
                {roadError ? (
                  <div style={{ marginTop: 8, fontSize: 11, opacity: 0.7 }}>
                    (OSRM error: {roadError})
                  </div>
                ) : null}
              </div>

              {(selA || selB) && (
                <button
                  onClick={resetPick}
                  style={{
                    marginTop: 12,
                    fontSize: 12,
                    padding: "7px 12px",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    background: "white",
                    cursor: "pointer",
                  }}
                >
                  Reset pilih
                </button>
              )}
            </div>
          </div>

          <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* ✅ garis MST per kategori */}
            {Object.keys(mstByKategori).map((k) => {
              const pts = grouped[k];
              const edges = mstByKategori[k] || [];
              if (!pts || pts.length <= 1) return null;
              if (pts.length > MAX_POINTS_FOR_LINES) return null;

              const c = colorByKategori[k] || "#666";

              return (
                <React.Fragment key={`lines-${k}`}>
                  {edges.map((e, i) => {
                    const a = pts[e.a];
                    const b = pts[e.b];
                    if (!a || !b) return null;

                    return (
                      <Polyline
                        key={`${k}-edge-${i}`}
                        positions={[
                          [a.lat, a.lng],
                          [b.lat, b.lng],
                        ]}
                        pathOptions={{ color: c, weight: 2, opacity: 0.7 }}
                        eventHandlers={{
                          click: () => {
                            setSelA({ key: a.refKey, kategori: k, lat: a.lat, lng: a.lng, label: a.label });
                            setSelB({ key: b.refKey, kategori: k, lat: b.lat, lng: b.lng, label: b.label });
                          },
                        }}
                      >
                        <Tooltip sticky direction="center" opacity={1}>
                          <div>
                            <b>{k}</b> • {fmtKm(e.dist)}
                          </div>
                        </Tooltip>
                      </Polyline>
                    );
                  })}
                </React.Fragment>
              );
            })}

            {/* ✅ RUTE JALAN (kalau OSRM sukses) */}
            {roadRoute && roadRoute.length >= 2 ? (
              <Polyline positions={roadRoute} pathOptions={{ color: "#000", weight: 4, opacity: 0.85 }} />
            ) : null}

            {/* fallback garis lurus tipis */}
            {selA && selB && (!roadRoute || roadRoute.length < 2) ? (
              <Polyline
                positions={[
                  [selA.lat, selA.lng],
                  [selB.lat, selB.lng],
                ]}
                pathOptions={{ color: "#000", weight: 2, opacity: 0.6 }}
              />
            ) : null}

            {/* ✅ marker + kotak */}
            {points.map((p, idx) => {
              const c = colorByKategori[p.kategori] || "#666";

              const dLat = metersToDeltaLat(BOX_SIZE_METERS);
              const dLng = metersToDeltaLng(BOX_SIZE_METERS, p.latitude);
              const bounds: [[number, number], [number, number]] = [
                [p.latitude - dLat, p.longitude - dLng],
                [p.latitude + dLat, p.longitude + dLng],
              ];

              const sel = pointToSel(p, idx);
              const isA = selA?.key === sel.key;
              const isB = selB?.key === sel.key;

              return (
                <React.Fragment key={sel.key}>
                  <Rectangle bounds={bounds} pathOptions={{ color: c, weight: 1, fillOpacity: 0 }} />

                  <CircleMarker
                    center={[p.latitude, p.longitude]}
                    radius={isA || isB ? 8 : 6}
                    pathOptions={{
                      color: isA ? "#000" : c,
                      fillColor: isB ? "#000" : c,
                      fillOpacity: 0.95,
                      weight: isA || isB ? 3 : 2,
                    }}
                    eventHandlers={{ click: () => onPick(sel) }}
                  >
                    <Tooltip sticky direction="top" opacity={1}>
                      <div style={{ lineHeight: 1.25 }}>
                        <div>
                          <b>{p.kategori}</b> • {p.up3}
                        </div>
                        <div style={{ marginTop: 6 }}>
                          {(p.items || []).slice(0, 8).map((it, i) => (
                            <div key={i} style={{ marginBottom: 6 }}>
                              <b>{it.keypoint}</b>
                              <br />
                              ULP: {it.ulp}
                              <br />
                              Status: {it.status || "-"}
                            </div>
                          ))}
                          {p.items && p.items.length > 8 ? <div>+{p.items.length - 8} lagi…</div> : null}
                        </div>
                      </div>
                    </Tooltip>
                  </CircleMarker>
                </React.Fragment>
              );
            })}
          </MapContainer>
        </div>
      );
    };
  },
  { ssr: false, loading: () => <div style={{ padding: 16 }}>Loading map…</div> }
);

export default function Page() {
  return <ClientOnlyMap />;
}