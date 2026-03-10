"use client";

import dynamic from "next/dynamic";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { divIcon, type DivIcon, type Map as LeafletMap } from "leaflet";
import { useMap } from "react-leaflet";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then((m) => m.CircleMarker), { ssr: false });
const Tooltip = dynamic(() => import("react-leaflet").then((m) => m.Tooltip), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });

/**
 * Apps Script URL
 * pakai 1 endpoint yang handle:
 * - ulplist
 * - bundle lite
 * - network
 */
const BUNDLE_URL =
  "https://script.google.com/macros/s/AKfycbz7DPwE1bcVqtEPjh4vxKkjKdG-nipMyw7wMbpBRt29DtBhEOzu3nlAc22zg9mudJ8ojA/exec";

const UP3 = "MAKASSAR SELATAN";
const DEDUP_DECIMALS = 6;

type LatLng = [number, number];
type NodeKategori = "GI" | "GH" | "LBS" | "REC";

type PolePointRaw = {
  rowId: number;
  ulp: string;
  formattedAddress: string;
  streetAddress: string;
  city: string;
  owner: string;
  latitude: number;
  longitude: number;
};

type NetNodeRaw = {
  rowId: number;
  kategori: NodeKategori;
  keypoint: string;
  ulp: string;
  up3: string;
  status: string;
  latitude: number;
  longitude: number;
};

type SectionLinkRaw = {
  id: string;
  rowId: number;
  ulp: string;
  up3: string;
  section: string;

  fromName: string;
  fromKategori: NodeKategori;
  fromLat: number;
  fromLng: number;

  toName: string;
  toKategori: NodeKategori;
  toLat: number;
  toLng: number;
};

type CatItem = {
  keypoint: string;
  ulp: string;
  status: string;
  kategori: NodeKategori;
};

type SectionMarker = {
  key: string;
  latitude: number;
  longitude: number;
  giItems: CatItem[];
  ghItems: CatItem[];
  lbsItems: CatItem[];
  recItems: CatItem[];
};

type DraftPoint = {
  lat: number;
  lng: number;
  kind: NodeKategori;
};

type RouteMode = "poles" | "road" | "straight";

type SavedLine = {
  id: string;
  name: string;
  color: string;
  points: DraftPoint[];
  path: LatLng[];
  visible: boolean;
  routeMode: RouteMode;
  profile: "driving";
  snapToPoleMaxMeters: number;
  poleEdgeCutoffMeters: number;
  poleKNearest: number;
  createdAt: number;
  ulpAtCreate?: string;
};

type PathBBox = {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
};

type AutoSectionLine = SectionLinkRaw & {
  path: LatLng[];
  bbox: PathBBox;
};

type PoleGroup = {
  key: string;
  latitude: number;
  longitude: number;
  ulp: string;
  rowIds: number[];
  owners: string[];
  address: string;
};

type SelectedPoint =
  | { kind: "pole"; data: PoleGroup }
  | { kind: "section"; data: SectionMarker };

// ===== JSONP queue =====
let __jsonpMutex: Promise<any> = Promise.resolve();

function jsonp<T>(url: string, params: Record<string, string>, timeoutMs = 60000): Promise<T> {
  const runOnce = () =>
    new Promise<T>((resolve, reject) => {
      const cbName = "cb";
      const script = document.createElement("script");
      script.async = true;

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("JSONP timeout"));
      }, timeoutMs);

      (window as any)[cbName] = (data: T) => {
        cleanup();
        resolve(data);
      };

      function cleanup() {
        clearTimeout(timer);
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      const qp = new URLSearchParams({
        ...params,
        callback: cbName,
        _ts: String(Date.now()),
      }).toString();

      script.src = `${url}${url.includes("?") ? "&" : "?"}${qp}`;
      script.onerror = () => {
        cleanup();
        reject(new Error("JSONP load error"));
      };

      document.head.appendChild(script);
    });

  const p = __jsonpMutex.then(runOnce);
  __jsonpMutex = p.catch(() => {});
  return p;
}

function MapSetter({ onReady }: { onReady: (m: LeafletMap) => void }) {
  const map = useMap();
  useEffect(() => onReady(map), [map, onReady]);
  return null;
}

function coordKey(lat: number, lng: number) {
  return `${lat.toFixed(DEDUP_DECIMALS)},${lng.toFixed(DEDUP_DECIMALS)}`;
}

function coordKey6(lat: number, lng: number) {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

function fmtCoord(lat: number, lng: number) {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function calcPathBBox(path: LatLng[]): PathBBox {
  let minLat = Infinity;
  let minLng = Infinity;
  let maxLat = -Infinity;
  let maxLng = -Infinity;

  for (const [lat, lng] of path) {
    if (lat < minLat) minLat = lat;
    if (lng < minLng) minLng = lng;
    if (lat > maxLat) maxLat = lat;
    if (lng > maxLng) maxLng = lng;
  }

  return { minLat, minLng, maxLat, maxLng };
}

function bboxIntersectsBounds(bbox: PathBBox, bounds: any) {
  if (!bounds) return true;
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  return !(
    bbox.maxLat < sw.lat ||
    bbox.minLat > ne.lat ||
    bbox.maxLng < sw.lng ||
    bbox.minLng > ne.lng
  );
}

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

// ===== fixed colors =====
const COLOR_TIANG = { stroke: "#1565c0", fill: "#1e88e5" };
const COLOR_GI = { stroke: "#ef6c00", fill: "#fb8c00" };
const COLOR_GH = { stroke: "#6a1b9a", fill: "#8e24aa" };
const COLOR_LBS = { stroke: "#ad1457", fill: "#e91e63" };
const COLOR_REC = { stroke: "#2e7d32", fill: "#43a047" };

// ===== ICONS =====
function makePinIcon(letter: string, color: { stroke: string; fill: string }, size = 30): DivIcon {
  const html = `
  <div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:transparent;border:none;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.35));">
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
      <path d="M12 2c-3.86 0-7 3.14-7 7 0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7z"
        fill="${color.fill}" stroke="${color.stroke}" stroke-width="1.6" />
      <circle cx="12" cy="9.2" r="4.2" fill="white" opacity="0.92" />
      <text x="12" y="10.8" text-anchor="middle"
        font-family="system-ui,-apple-system,Segoe UI,Roboto,Arial" font-size="7.6" font-weight="800"
        fill="${color.stroke}">${letter}</text>
    </svg>
  </div>`;
  return divIcon({
    className: "w9-div-icon",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    tooltipAnchor: [0, -size * 0.7],
  });
}

function makePoleIcon(color: { stroke: string; fill: string }, size = 24): DivIcon {
  const html = `
  <div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:transparent;border:none;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.35));">
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
      <path d="M12 3v17" stroke="white" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      <path d="M7.5 7.2h9" stroke="white" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      <path d="M9 20.2h6" stroke="white" stroke-width="3.2" stroke-linecap="round" fill="none"/>

      <path d="M12 3v17" stroke="${color.stroke}" stroke-width="2.0" stroke-linecap="round" fill="none"/>
      <path d="M7.5 7.2h9" stroke="${color.fill}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
      <path d="M9 20.2h6" stroke="${color.stroke}" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    </svg>
  </div>`;
  return divIcon({
    className: "w9-div-icon",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    tooltipAnchor: [0, -size * 0.8],
  });
}

async function fetchOsrmRoute(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  profile: "driving",
  timeoutMs = 15000
): Promise<LatLng[] | null> {
  const url = `https://router.project-osrm.org/route/v1/${profile}/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson&steps=false`;

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: ac.signal });
    if (!res.ok) return null;
    const json = await res.json();
    const coords: Array<[number, number]> | undefined = json?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;
    return coords.map((c) => [c[1], c[0]] as LatLng);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// ===== MinHeap =====
class MinHeap<T> {
  private a: Array<{ k: number; v: T }> = [];

  get size() {
    return this.a.length;
  }

  push(k: number, v: T) {
    const a = this.a;
    a.push({ k, v });
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].k <= a[i].k) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }

  pop(): { k: number; v: T } | null {
    const a = this.a;
    if (!a.length) return null;

    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      while (true) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l].k < a[m].k) m = l;
        if (r < a.length && a[r].k < a[m].k) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

// ===== Pole Router =====
function buildPoleRouter(poles: PoleGroup[], poleEdgeCutoffMeters: number, poleKNearest: number) {
  const n = poles.length;
  if (n < 2) return null;

  const lat0 = poles.reduce((s, p) => s + p.latitude, 0) / n;
  const lat0Rad = (lat0 * Math.PI) / 180;
  const mPerDegLat = 110574;
  const mPerDegLng = 111320 * Math.cos(lat0Rad);

  const xs = new Array<number>(n);
  const ys = new Array<number>(n);

  for (let i = 0; i < n; i++) {
    xs[i] = poles[i].longitude * mPerDegLng;
    ys[i] = poles[i].latitude * mPerDegLat;
  }

  const cell = Math.max(60, Math.min(250, Math.floor(poleEdgeCutoffMeters)));
  const key = (cx: number, cy: number) => `${cx}|${cy}`;
  const grid = new Map<string, number[]>();

  for (let i = 0; i < n; i++) {
    const cx = Math.floor(xs[i] / cell);
    const cy = Math.floor(ys[i] / cell);
    const k = key(cx, cy);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k)!.push(i);
  }

  type Edge = { j: number; w: number; d: number };
  const adj: Edge[][] = Array.from({ length: n }, () => []);
  const seen = new Set<string>();
  const maxR = Math.max(1, Math.ceil(poleEdgeCutoffMeters / cell));
  const stepSoft = Math.max(30, poleEdgeCutoffMeters * 0.6);

  for (let i = 0; i < n; i++) {
    const cx = Math.floor(xs[i] / cell);
    const cy = Math.floor(ys[i] / cell);

    const candidates: Array<{ j: number; d: number }> = [];
    const candSeen = new Set<number>();

    for (let dx = -maxR; dx <= maxR; dx++) {
      for (let dy = -maxR; dy <= maxR; dy++) {
        const arr = grid.get(key(cx + dx, cy + dy));
        if (!arr) continue;

        for (const j of arr) {
          if (j === i) continue;
          if (candSeen.has(j)) continue;
          candSeen.add(j);

          const d = Math.hypot(xs[j] - xs[i], ys[j] - ys[i]);
          if (d <= poleEdgeCutoffMeters) candidates.push({ j, d });
        }
      }
    }

    if (!candidates.length) continue;

    candidates.sort((a, b) => a.d - b.d);
    const take = candidates.slice(0, Math.max(1, Math.min(poleKNearest, candidates.length)));

    for (const c of take) {
      const a = i < c.j ? i : c.j;
      const b = i < c.j ? c.j : i;
      const k2 = `${a}-${b}`;
      if (seen.has(k2)) continue;
      seen.add(k2);

      const ratio = c.d / stepSoft;
      const w = c.d * (1 + ratio * ratio);

      adj[a].push({ j: b, w, d: c.d });
      adj[b].push({ j: a, w, d: c.d });
    }
  }

  function nearestPoleIndex(lat: number, lng: number, maxMeters: number): number {
    const x = lng * mPerDegLng;
    const y = lat * mPerDegLat;

    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);

    const r = Math.max(1, Math.ceil(maxMeters / cell));
    let best = Infinity;
    let bestIdx = -1;

    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        const arr = grid.get(key(cx + dx, cy + dy));
        if (!arr) continue;

        for (const i of arr) {
          const d = Math.hypot(xs[i] - x, ys[i] - y);
          if (d < best) {
            best = d;
            bestIdx = i;
          }
        }
      }
    }

    return bestIdx >= 0 && best <= maxMeters ? bestIdx : -1;
  }

  const pathCache = new Map<string, number[]>();

  function dijkstraPath(s: number, t: number): number[] | null {
    if (s === t) return [s];

    const cacheKey = s < t ? `${s}|${t}` : `${t}|${s}`;
    const cached = pathCache.get(cacheKey);
    if (cached) return cached;

    const dist = new Float64Array(n);
    const prev = new Int32Array(n);
    const visited = new Uint8Array(n);

    for (let i = 0; i < n; i++) {
      dist[i] = Number.POSITIVE_INFINITY;
      prev[i] = -1;
    }

    dist[s] = 0;
    const pq = new MinHeap<number>();
    pq.push(0, s);

    while (pq.size) {
      const cur = pq.pop()!;
      const u = cur.v;
      if (visited[u]) continue;
      visited[u] = 1;

      if (u === t) break;

      const edges = adj[u];
      for (let ei = 0; ei < edges.length; ei++) {
        const e = edges[ei];
        const v = e.j;
        if (visited[v]) continue;

        const nd = dist[u] + e.w;
        if (nd < dist[v]) {
          dist[v] = nd;
          prev[v] = u;
          pq.push(nd, v);
        }
      }
    }

    if (!Number.isFinite(dist[t])) return null;

    const out: number[] = [];
    let cur = t;
    while (cur !== -1) {
      out.push(cur);
      if (cur === s) break;
      cur = prev[cur];
    }

    out.reverse();
    pathCache.set(cacheKey, out);
    return out;
  }

  function pointToSegDistAndT(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
    const vx = bx - ax;
    const vy = by - ay;
    const wx = px - ax;
    const wy = py - ay;
    const vv = vx * vx + vy * vy;
    if (vv <= 1e-9) return { d: Math.hypot(px - ax, py - ay), t: 0 };
    let t = (wx * vx + wy * vy) / vv;
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    const cx = ax + t * vx;
    const cy = ay + t * vy;
    return { d: Math.hypot(px - cx, py - cy), t };
  }

  function polesNearSegment(i: number, j: number, corridorMeters: number) {
    const ax = xs[i];
    const ay = ys[i];
    const bx = xs[j];
    const by = ys[j];

    const minx = Math.min(ax, bx) - corridorMeters;
    const maxx = Math.max(ax, bx) + corridorMeters;
    const miny = Math.min(ay, by) - corridorMeters;
    const maxy = Math.max(ay, by) + corridorMeters;

    const cminx = Math.floor(minx / cell);
    const cmaxx = Math.floor(maxx / cell);
    const cminy = Math.floor(miny / cell);
    const cmaxy = Math.floor(maxy / cell);

    const picks: Array<{ idx: number; t: number }> = [];
    const used = new Set<number>();
    used.add(i);
    used.add(j);

    for (let cx = cminx; cx <= cmaxx; cx++) {
      for (let cy = cminy; cy <= cmaxy; cy++) {
        const arr = grid.get(key(cx, cy));
        if (!arr) continue;

        for (const p of arr) {
          if (used.has(p)) continue;
          const r = pointToSegDistAndT(xs[p], ys[p], ax, ay, bx, by);
          if (r.d <= corridorMeters && r.t > 0 && r.t < 1) {
            used.add(p);
            picks.push({ idx: p, t: r.t });
          }
        }
      }
    }

    picks.sort((a, b) => a.t - b.t);
    if (picks.length > 1200) return [];
    return picks.map((x) => x.idx);
  }

  function routeBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }, snapMaxMeters: number): LatLng[] | null {
    const ia = nearestPoleIndex(a.lat, a.lng, snapMaxMeters);
    const ib = nearestPoleIndex(b.lat, b.lng, snapMaxMeters);
    if (ia < 0 || ib < 0) return null;

    const idxPath = dijkstraPath(ia, ib);
    if (!idxPath || idxPath.length < 1) return null;

    const corridor = Math.max(18, Math.min(45, poleEdgeCutoffMeters * 0.45));

    const full: number[] = [idxPath[0]];
    for (let k = 0; k < idxPath.length - 1; k++) {
      const u = idxPath[k];
      const v = idxPath[k + 1];
      const mids = polesNearSegment(u, v, corridor);

      for (const m of mids) {
        if (full[full.length - 1] !== m) full.push(m);
      }
      if (full[full.length - 1] !== v) full.push(v);
    }

    const out: LatLng[] = [];
    out.push([a.lat, a.lng]);

    for (const i of full) {
      const p: LatLng = [poles[i].latitude, poles[i].longitude];
      const last = out[out.length - 1];
      if (!last || Math.abs(last[0] - p[0]) > 1e-10 || Math.abs(last[1] - p[1]) > 1e-10) out.push(p);
    }

    const last = out[out.length - 1];
    if (!last || Math.abs(last[0] - b.lat) > 1e-10 || Math.abs(last[1] - b.lng) > 1e-10) {
      out.push([b.lat, b.lng]);
    }

    return out;
  }

  return { routeBetween };
}

export default function MapsPage() {
  const [mounted, setMounted] = useState(false);
  const [map, setMap] = useState<LeafletMap | null>(null);

  const [selectedBase, setSelectedBase] = useState<"normal" | "satellite">("normal");
  const [ssMode, setSsMode] = useState(false);

  // ===== manual line =====
  const [editMode, setEditMode] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [draftPts, setDraftPts] = useState<DraftPoint[]>([]);
  const [savedLines, setSavedLines] = useState<SavedLine[]>([]);
  const [lineName, setLineName] = useState("");
  const [lineColor, setLineColor] = useState("#000000");
  const [routeMode, setRouteMode] = useState<RouteMode>("poles");
  const [routingBusy, setRoutingBusy] = useState(false);

  const [snapToPoleMaxMeters, setSnapToPoleMaxMeters] = useState(200);
  const [poleEdgeCutoffMeters, setPoleEdgeCutoffMeters] = useState(110);
  const [poleKNearest, setPoleKNearest] = useState(8);

  const roadRouteCacheRef = useRef<Map<string, LatLng[]>>(new Map());

  const [deleteClickMode, setDeleteClickMode] = useState(false);
  const [manageLinesOn, setManageLinesOn] = useState(true);

  // ===== ULP =====
  const [ulpList, setUlpList] = useState<string[]>([]);
  const [ulpLoading, setUlpLoading] = useState(false);
  const [selectedUlp, setSelectedUlp] = useState("");

  // ===== poles =====
  const [bundleLoading, setBundleLoading] = useState(false);
  const [polesRaw, setPolesRaw] = useState<PolePointRaw[]>([]);

  // ===== network nodes + section A-B =====
  const [networkLoading, setNetworkLoading] = useState(false);
  const [networkNodesRaw, setNetworkNodesRaw] = useState<NetNodeRaw[]>([]);
  const [networkLinksRaw, setNetworkLinksRaw] = useState<SectionLinkRaw[]>([]);
  const [autoSectionLines, setAutoSectionLines] = useState<AutoSectionLine[]>([]);
  const [autoRouteBusy, setAutoRouteBusy] = useState(false);

  const autoRouteCacheRef = useRef<Map<string, LatLng[]>>(new Map());

  const [errMsg, setErrMsg] = useState("");
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null);

  // ===== section/node UI =====
  const [showSectionPoints, setShowSectionPoints] = useState(true);
  const [showAutoSectionLines, setShowAutoSectionLines] = useState(true);
  const [maxSectionDisplay, setMaxSectionDisplay] = useState(2500);
  const [maxAutoSectionDisplay, setMaxAutoSectionDisplay] = useState(600);
  const [sectionFilter, setSectionFilter] = useState<"all" | "gi" | "gh" | "lbs" | "rec">("all");
  const [secIdx, setSecIdx] = useState(0);

  // ===== anti lag =====
  const [viewportOnly, setViewportOnly] = useState(true);
  const [currentZoom, setCurrentZoom] = useState(11);
  const boundsRef = useRef<any>(null);
  const [boundsVersion, setBoundsVersion] = useState(0);

  const iconGi = useMemo(() => makePinIcon("G", COLOR_GI, 30), []);
  const iconGh = useMemo(() => makePinIcon("H", COLOR_GH, 30), []);
  const iconLbs = useMemo(() => makePinIcon("L", COLOR_LBS, 30), []);
  const iconRec = useMemo(() => makePinIcon("R", COLOR_REC, 30), []);

  const poleIconSize = useMemo(() => {
    const z = currentZoom;
    const size = 34 - (z - 10) * 0.9;
    return Math.max(22, Math.min(34, Math.round(size)));
  }, [currentZoom]);

  const iconTiang = useMemo(() => makePoleIcon(COLOR_TIANG, poleIconSize), [poleIconSize]);

  const poleCanvasRadius = useMemo(() => {
    const z = currentZoom;
    const r = 4.0 - (z - 10) * 0.18;
    return Math.max(2.4, Math.min(4.0, r));
  }, [currentZoom]);

  const sectionCanvasRadius = useMemo(() => {
    const z = currentZoom;
    const r = 3.0 - (z - 10) * 0.2;
    return Math.max(1.7, Math.min(3.0, r));
  }, [currentZoom]);

  const canvasStrokeWeight = useMemo(() => 1.35, []);

  useEffect(() => setMounted(true), []);

  // ===== persist lines =====
  useEffect(() => {
    if (!mounted) return;
    try {
      const raw = localStorage.getItem("w9_saved_lines_v4");
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      const cleaned: SavedLine[] = parsed
        .map((x: any) => {
          const pts: DraftPoint[] = Array.isArray(x?.points)
            ? x.points
                .map((p: any) => ({
                  lat: Number(p?.lat),
                  lng: Number(p?.lng),
                  kind: ["GI", "GH", "LBS", "REC"].includes(String(p?.kind || "").toUpperCase())
                    ? (String(p.kind).toUpperCase() as NodeKategori)
                    : "LBS",
                }))
                .filter((p: DraftPoint) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
            : [];

          const path: LatLng[] = Array.isArray(x?.path)
            ? x.path
                .map((p: any) => [Number(p?.[0]), Number(p?.[1])] as LatLng)
                .filter((p: LatLng) => Number.isFinite(p[0]) && Number.isFinite(p[1]))
            : pts.map((p) => [p.lat, p.lng] as LatLng);

          const rm: RouteMode = x?.routeMode === "road" ? "road" : x?.routeMode === "straight" ? "straight" : "poles";

          const out: SavedLine = {
            id: String(x?.id || ""),
            name: String(x?.name || "Line"),
            color: String(x?.color || "#000000"),
            points: pts,
            path,
            visible: x?.visible !== false,
            routeMode: rm,
            profile: "driving",
            snapToPoleMaxMeters: Number.isFinite(Number(x?.snapToPoleMaxMeters)) ? Number(x.snapToPoleMaxMeters) : 200,
            poleEdgeCutoffMeters: Number.isFinite(Number(x?.poleEdgeCutoffMeters)) ? Number(x.poleEdgeCutoffMeters) : 110,
            poleKNearest: Number.isFinite(Number(x?.poleKNearest)) ? Number(x.poleKNearest) : 8,
            createdAt: Number.isFinite(Number(x?.createdAt)) ? Number(x.createdAt) : Date.now(),
            ulpAtCreate: typeof x?.ulpAtCreate === "string" ? x.ulpAtCreate : undefined,
          };

          if (!out.id || out.points.length < 2 || out.path.length < 2) return null;
          return out;
        })
        .filter(Boolean) as SavedLine[];

      setSavedLines(cleaned);
    } catch {
      // ignore
    }
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem("w9_saved_lines_v4", JSON.stringify(savedLines));
    } catch {
      // ignore
    }
  }, [mounted, savedLines]);

  // ===== track bounds =====
  useEffect(() => {
    if (!map) return;

    const update = () => {
      boundsRef.current = map.getBounds();
      setCurrentZoom(map.getZoom());
      setBoundsVersion((v) => v + 1);
    };

    map.on("moveend", update);
    map.on("zoomend", update);
    update();

    return () => {
      map.off("moveend", update);
      map.off("zoomend", update);
    };
  }, [map]);

  const focusTo = useCallback(
    (lat: number, lng: number) => {
      if (!map) return;
      const z = map.getZoom();
      map.flyTo([lat, lng] as any, z, { animate: true, duration: 0.35 } as any);
    },
    [map]
  );

  const confirmDelete = useCallback((name?: string) => {
    const label = name?.trim() ? ` "${name.trim()}"` : "";
    return window.confirm(`Yakin menghapus garis${label}?`);
  }, []);

  const addDraftPoint = useCallback((p: DraftPoint) => {
    setDraftPts((prev) => {
      if (!prev.length) return [p];
      const last = prev[prev.length - 1];
      const same =
        Math.abs(last.lat - p.lat) < 1e-10 &&
        Math.abs(last.lng - p.lng) < 1e-10 &&
        last.kind === p.kind;
      if (same) return prev;
      return [...prev, p];
    });
  }, []);

  const undoDraft = useCallback(() => setDraftPts((prev) => prev.slice(0, -1)), []);
  const clearDraft = useCallback(() => setDraftPts([]), []);

  const toggleLineVisible = useCallback((id: string) => {
    setSavedLines((prev) => prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
  }, []);

  const deleteLine = useCallback(
    (id: string) => {
      setSavedLines((prev) => prev.filter((l) => l.id !== id));
      if (editingLineId === id) {
        setEditingLineId(null);
        setDraftPts([]);
        setLineName("");
        setLineColor("#000000");
      }
    },
    [editingLineId]
  );

  const deleteAllLines = useCallback(() => {
    setSavedLines([]);
    setEditingLineId(null);
    setDraftPts([]);
    setLineName("");
    setLineColor("#000000");
  }, []);

  // ===== load ULP =====
  const loadUlpList = useCallback(async () => {
    try {
      setUlpLoading(true);
      setErrMsg("");

      const resp: any = await jsonp(
        BUNDLE_URL,
        {
          mode: "ulplist",
          up3: UP3,
          cache: "1",
          ttlMin: "1440",
        },
        60000
      );

      if (!resp?.success || !Array.isArray(resp?.ulps)) throw new Error(resp?.error || "ulplist gagal");
      setUlpList(resp.ulps);
    } catch (e: any) {
      setErrMsg("Gagal load ULP list: " + String(e?.message || e));
      setUlpList([]);
    } finally {
      setUlpLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUlpList();
  }, [loadUlpList]);

  // ===== load poles lite =====
  useEffect(() => {
    (async () => {
      if (!selectedUlp) {
        setPolesRaw([]);
        return;
      }

      try {
        setErrMsg("");
        setBundleLoading(true);

        const resp: any = await jsonp(
          BUNDLE_URL,
          {
            mode: "bundle",
            ulp: selectedUlp,
            up3: UP3,
            lite: "1",
            cache: "1",
            ttlMin: "360",
          },
          90000
        );

        if (!resp?.success) throw new Error(resp?.error || "bundle lite gagal");

        const poles: PolePointRaw[] = Array.isArray(resp?.poles)
          ? resp.poles
              .map((p: any) => ({
                rowId: Number(p?.rowId),
                ulp: String(p?.ulp || ""),
                formattedAddress: String(p?.formattedAddress || ""),
                streetAddress: String(p?.streetAddress || ""),
                city: String(p?.city || ""),
                owner: String(p?.owner || ""),
                latitude: Number(p?.latitude),
                longitude: Number(p?.longitude),
              }))
              .filter((p: PolePointRaw) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
          : [];

        setPolesRaw(poles);
      } catch (e: any) {
        setErrMsg("Gagal load tiang: " + String(e?.message || e));
        setPolesRaw([]);
      } finally {
        setBundleLoading(false);
      }
    })();
  }, [selectedUlp]);

  // ===== load network GI/GH/LBS/REC + SECTION A-B =====
  useEffect(() => {
    (async () => {
      if (!selectedUlp) {
        setNetworkNodesRaw([]);
        setNetworkLinksRaw([]);
        setAutoSectionLines([]);
        return;
      }

      try {
        setNetworkLoading(true);
        setErrMsg("");

        const resp: any = await jsonp(
          BUNDLE_URL,
          {
            mode: "network",
            ulp: selectedUlp,
            up3: UP3,
            cache: "1",
            ttlMin: "120",
          },
          90000
        );

        if (!resp?.success) throw new Error(resp?.error || "network gagal");

        const nodes: NetNodeRaw[] = Array.isArray(resp?.nodes)
          ? resp.nodes
              .map((x: any) => ({
                rowId: Number(x?.rowId),
                kategori: String(x?.kategori || "").toUpperCase() as NodeKategori,
                keypoint: String(x?.keypoint || ""),
                ulp: String(x?.ulp || ""),
                up3: String(x?.up3 || ""),
                status: String(x?.status || ""),
                latitude: Number(x?.latitude),
                longitude: Number(x?.longitude),
              }))
              .filter(
                (x: NetNodeRaw) =>
                  ["GI", "GH", "LBS", "REC"].includes(x.kategori) &&
                  Number.isFinite(x.latitude) &&
                  Number.isFinite(x.longitude)
              )
          : [];

        const links: SectionLinkRaw[] = Array.isArray(resp?.links)
          ? resp.links
              .map((x: any) => ({
                id: String(x?.id || ""),
                rowId: Number(x?.rowId),
                ulp: String(x?.ulp || ""),
                up3: String(x?.up3 || ""),
                section: String(x?.section || ""),
                fromName: String(x?.fromName || ""),
                fromKategori: String(x?.fromKategori || "").toUpperCase() as NodeKategori,
                fromLat: Number(x?.fromLat),
                fromLng: Number(x?.fromLng),
                toName: String(x?.toName || ""),
                toKategori: String(x?.toKategori || "").toUpperCase() as NodeKategori,
                toLat: Number(x?.toLat),
                toLng: Number(x?.toLng),
              }))
              .filter(
                (x: SectionLinkRaw) =>
                  !!x.id &&
                  Number.isFinite(x.fromLat) &&
                  Number.isFinite(x.fromLng) &&
                  Number.isFinite(x.toLat) &&
                  Number.isFinite(x.toLng)
              )
          : [];

        setNetworkNodesRaw(nodes);
        setNetworkLinksRaw(links);
      } catch (e: any) {
        setErrMsg("Gagal load network: " + String(e?.message || e));
        setNetworkNodesRaw([]);
        setNetworkLinksRaw([]);
        setAutoSectionLines([]);
      } finally {
        setNetworkLoading(false);
      }
    })();
  }, [selectedUlp]);

  // ===== poles dedup =====
  const poleGroups = useMemo<PoleGroup[]>(() => {
    const m = new Map<string, PoleGroup>();

    for (const p of polesRaw) {
      const lat = Number(p.latitude);
      const lng = Number(p.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const k = coordKey(lat, lng);

      if (!m.has(k)) {
        m.set(k, {
          key: k,
          latitude: Number(lat.toFixed(DEDUP_DECIMALS)),
          longitude: Number(lng.toFixed(DEDUP_DECIMALS)),
          ulp: p.ulp || selectedUlp,
          rowIds: [p.rowId],
          owners: p.owner ? [String(p.owner)] : [],
          address: p.formattedAddress || p.streetAddress || "",
        });
      } else {
        const g = m.get(k)!;
        g.rowIds.push(p.rowId);
        if (p.owner) {
          const o = String(p.owner);
          if (!g.owners.includes(o)) g.owners.push(o);
        }
        if (!g.address && (p.formattedAddress || p.streetAddress)) {
          g.address = p.formattedAddress || p.streetAddress || "";
        }
      }
    }

    return Array.from(m.values());
  }, [polesRaw, selectedUlp]);

  // ===== section markers =====
  const sectionMarkersAll = useMemo<SectionMarker[]>(() => {
    const out = new Map<string, SectionMarker>();

    for (const p of networkNodesRaw) {
      const k = coordKey(p.latitude, p.longitude);

      if (!out.has(k)) {
        out.set(k, {
          key: k,
          latitude: Number(p.latitude.toFixed(DEDUP_DECIMALS)),
          longitude: Number(p.longitude.toFixed(DEDUP_DECIMALS)),
          giItems: [],
          ghItems: [],
          lbsItems: [],
          recItems: [],
        });
      }

      const g = out.get(k)!;
      const item: CatItem = {
        keypoint: p.keypoint || "",
        ulp: p.ulp || "",
        status: p.status || "",
        kategori: p.kategori,
      };

      if (p.kategori === "GI") g.giItems.push(item);
      if (p.kategori === "GH") g.ghItems.push(item);
      if (p.kategori === "LBS") g.lbsItems.push(item);
      if (p.kategori === "REC") g.recItems.push(item);
    }

    return Array.from(out.values());
  }, [networkNodesRaw]);

  const sectionMarkersFiltered = useMemo(() => {
    return sectionMarkersAll.filter((m) => {
      const gi = m.giItems.length;
      const gh = m.ghItems.length;
      const lbs = m.lbsItems.length;
      const rec = m.recItems.length;

      if (sectionFilter === "all") return gi + gh + lbs + rec > 0;
      if (sectionFilter === "gi") return gi > 0;
      if (sectionFilter === "gh") return gh > 0;
      if (sectionFilter === "lbs") return lbs > 0;
      return rec > 0;
    });
  }, [sectionMarkersAll, sectionFilter]);

  const canShowPoles = !!selectedUlp;
  const canShowSections = showSectionPoints;
  const poleInteractionLocked = editMode || deleteClickMode;

  const poleGroupsDisplayed = useMemo(() => {
    if (!canShowPoles) return [];
    let list = poleGroups;
    const b = viewportOnly ? boundsRef.current : null;
    if (b) list = list.filter((p) => b.contains([p.latitude, p.longitude] as any));
    return list;
  }, [poleGroups, viewportOnly, boundsVersion, canShowPoles]);

  const sectionMarkersDisplayed = useMemo(() => {
    if (!canShowSections) return [];
    let list = sectionMarkersFiltered;
    const b = viewportOnly ? boundsRef.current : null;
    if (b) list = list.filter((m) => b.contains([m.latitude, m.longitude] as any));
    return list.slice(0, Math.max(1, maxSectionDisplay));
  }, [sectionMarkersFiltered, canShowSections, maxSectionDisplay, viewportOnly, boundsVersion]);

  const poleRouter = useMemo(() => {
    if (!poleGroups.length) return null;
    return buildPoleRouter(poleGroups, poleEdgeCutoffMeters, poleKNearest);
  }, [poleGroups, poleEdgeCutoffMeters, poleKNearest]);

  // ===== auto route section A-B ngikut tiang =====
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!selectedUlp || !showAutoSectionLines || !poleRouter || !networkLinksRaw.length) {
        setAutoSectionLines([]);
        return;
      }

      try {
        setAutoRouteBusy(true);
        const out: AutoSectionLine[] = [];

        for (let i = 0; i < networkLinksRaw.length; i++) {
          if (cancelled) return;

          const link = networkLinksRaw[i];

          const cacheKey = [
            selectedUlp,
            link.id,
            coordKey6(link.fromLat, link.fromLng),
            coordKey6(link.toLat, link.toLng),
            snapToPoleMaxMeters,
            poleEdgeCutoffMeters,
            poleKNearest,
          ].join("|");

          let path = autoRouteCacheRef.current.get(cacheKey);

          if (!path) {
            path =
              poleRouter.routeBetween(
                { lat: link.fromLat, lng: link.fromLng },
                { lat: link.toLat, lng: link.toLng },
                snapToPoleMaxMeters
              ) ??
              ([
                [link.fromLat, link.fromLng],
                [link.toLat, link.toLng],
              ] as LatLng[]);

            autoRouteCacheRef.current.set(cacheKey, path);
          }

          out.push({
            ...link,
            path,
            bbox: calcPathBBox(path),
          });

          // yield dikit biar UI nggak freeze
          if (i > 0 && i % 15 === 0) {
            await new Promise((r) => setTimeout(r, 0));
          }
        }

        if (!cancelled) setAutoSectionLines(out);
      } finally {
        if (!cancelled) setAutoRouteBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    selectedUlp,
    showAutoSectionLines,
    poleRouter,
    networkLinksRaw,
    snapToPoleMaxMeters,
    poleEdgeCutoffMeters,
    poleKNearest,
  ]);

  const autoSectionLinesDisplayed = useMemo(() => {
    if (!showAutoSectionLines) return [];
    let list = autoSectionLines;
    const b = viewportOnly ? boundsRef.current : null;
    if (b) list = list.filter((l) => bboxIntersectsBounds(l.bbox, b));
    return list.slice(0, Math.max(1, maxAutoSectionDisplay));
  }, [autoSectionLines, showAutoSectionLines, viewportOnly, boundsVersion, maxAutoSectionDisplay]);

  useEffect(() => {
    setSecIdx(0);
  }, [showSectionPoints, maxSectionDisplay, sectionFilter, selectedUlp]);

  const sectionStats = useMemo(() => {
    let giItems = 0;
    let ghItems = 0;
    let lbsItems = 0;
    let recItems = 0;

    for (const s of sectionMarkersFiltered) {
      giItems += s.giItems.length;
      ghItems += s.ghItems.length;
      lbsItems += s.lbsItems.length;
      recItems += s.recItems.length;
    }

    return {
      titikUnik: sectionMarkersFiltered.length,
      giItems,
      ghItems,
      lbsItems,
      recItems,
      shown: sectionMarkersDisplayed.length,
      autoLinksShown: autoSectionLinesDisplayed.length,
    };
  }, [sectionMarkersFiltered, sectionMarkersDisplayed, autoSectionLinesDisplayed]);

  const gotoSectionIndex = (idx: number) => {
    const list = sectionMarkersDisplayed;
    if (!list.length) return;
    const i = ((idx % list.length) + list.length) % list.length;
    setSecIdx(i);
    const m = list[i];
    setSelectedPoint({ kind: "section", data: m });
    focusTo(m.latitude, m.longitude);
  };

  const renderItems = (items: CatItem[], max = 10) => {
    if (!items.length) return <div style={{ color: "#666" }}>-</div>;

    const shown = items.slice(0, max);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {shown.map((it, i) => (
          <div key={i} style={{ padding: "6px 8px", border: "1px solid #eee", borderRadius: 8 }}>
            <div style={{ fontWeight: 700 }}>{it.keypoint || "-"}</div>
            <div style={{ fontSize: 12, color: "#444" }}>Kategori: {it.kategori || "-"}</div>
            <div style={{ fontSize: 12, color: "#444" }}>ULP: {it.ulp || "-"}</div>
            <div style={{ fontSize: 12, color: "#444" }}>Status: {it.status || "-"}</div>
          </div>
        ))}
        {items.length > max ? <div style={{ color: "#666" }}>+{items.length - max} lagi…</div> : null}
      </div>
    );
  };

  const THRESHOLD_DOM_MARKERS = 1500;
  const polesUseCanvas = poleGroupsDisplayed.length > THRESHOLD_DOM_MARKERS;
  const sectionsUseCanvas = sectionMarkersDisplayed.length > THRESHOLD_DOM_MARKERS;
  const autoLineTooltipEnabled = autoSectionLinesDisplayed.length <= 300;

  // ===== build manual line path =====
  const buildLinePath = useCallback(
    async (pts: DraftPoint[], rm: RouteMode): Promise<LatLng[]> => {
      if (pts.length < 2) return pts.map((p) => [p.lat, p.lng] as LatLng);

      if (rm === "straight") return pts.map((p) => [p.lat, p.lng] as LatLng);

      if (rm === "road") {
        const out: LatLng[] = [];
        const profile: "driving" = "driving";

        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i];
          const b = pts[i + 1];
          const k = `${profile}|${coordKey6(a.lat, a.lng)}|${coordKey6(b.lat, b.lng)}`;
          let seg = roadRouteCacheRef.current.get(k);

          if (!seg) {
            seg =
              (await fetchOsrmRoute({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng }, profile)) ?? [
                [a.lat, a.lng],
                [b.lat, b.lng],
              ];
            roadRouteCacheRef.current.set(k, seg);
          }

          if (out.length === 0) out.push(...seg);
          else out.push(...seg.slice(1));
        }

        return out;
      }

      const router = poleRouter;
      if (!router) return pts.map((p) => [p.lat, p.lng] as LatLng);

      const out: LatLng[] = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const seg =
          router.routeBetween(
            { lat: a.lat, lng: a.lng },
            { lat: b.lat, lng: b.lng },
            snapToPoleMaxMeters
          ) ?? ([[a.lat, a.lng], [b.lat, b.lng]] as LatLng[]);

        if (out.length === 0) out.push(...seg);
        else out.push(...seg.slice(1));
      }

      return out;
    },
    [poleRouter, snapToPoleMaxMeters]
  );

  const startEditLine = useCallback((l: SavedLine) => {
    setEditMode(true);
    setEditingLineId(l.id);
    setDraftPts(l.points);
    setLineName(l.name);
    setLineColor(l.color || "#000000");
    setRouteMode(l.routeMode);
    setSnapToPoleMaxMeters(l.snapToPoleMaxMeters ?? 200);
    setPoleEdgeCutoffMeters(l.poleEdgeCutoffMeters ?? 110);
    setPoleKNearest(l.poleKNearest ?? 8);
  }, []);

  const cancelEditLine = useCallback(() => {
    setEditingLineId(null);
    setDraftPts([]);
    setLineName("");
    setLineColor("#000000");
  }, []);

  const saveOrUpdateLine = useCallback(async () => {
    if (draftPts.length < 2) return;
    if (routingBusy) return;

    const name = (lineName || "").trim() || (editingLineId ? "Line" : `Line ${Date.now()}`);
    const id = editingLineId || `${Date.now()}_${Math.random().toString(16).slice(2)}`;

    try {
      setRoutingBusy(true);
      setErrMsg("");

      const path = await buildLinePath(draftPts, routeMode);

      const line: SavedLine = {
        id,
        name,
        color: lineColor || "#000000",
        points: draftPts,
        path,
        visible: true,
        routeMode,
        profile: "driving",
        snapToPoleMaxMeters,
        poleEdgeCutoffMeters,
        poleKNearest,
        createdAt: Date.now(),
        ulpAtCreate: selectedUlp || undefined,
      };

      setSavedLines((prev) => {
        const idx = prev.findIndex((x) => x.id === id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = {
            ...line,
            createdAt: prev[idx].createdAt,
            ulpAtCreate: prev[idx].ulpAtCreate ?? line.ulpAtCreate,
          };
          return copy;
        }
        return [...prev, line];
      });

      setDraftPts([]);
      setLineName("");
      setEditingLineId(null);
      setLineColor("#000000");
    } catch (e: any) {
      setErrMsg("Gagal bikin garis: " + String(e?.message || e));
    } finally {
      setRoutingBusy(false);
    }
  }, [
    draftPts,
    routingBusy,
    lineName,
    editingLineId,
    buildLinePath,
    routeMode,
    lineColor,
    snapToPoleMaxMeters,
    poleEdgeCutoffMeters,
    poleKNearest,
    selectedUlp,
  ]);

  const onClickNode = useCallback(
    (s: SectionMarker, clickedLat: number, clickedLng: number, kind: NodeKategori) => {
      setSelectedPoint({ kind: "section", data: s });
      focusTo(clickedLat, clickedLng);

      if (editMode) {
        addDraftPoint({ lat: clickedLat, lng: clickedLng, kind });
      }
    },
    [focusTo, editMode, addDraftPoint]
  );

  useEffect(() => {
    if (!editMode) {
      setDraftPts([]);
      setEditingLineId(null);
      setLineName("");
      setLineColor("#000000");
    }
  }, [editMode]);

  if (!mounted) return null;

  const editingLine = editingLineId ? savedLines.find((l) => l.id === editingLineId) : null;

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      {/* LEFT INFO */}
      {!ssMode && (
        <div
          style={{
            position: "absolute",
            zIndex: 1000,
            top: 16,
            left: 16,
            background: "white",
            padding: 10,
            borderRadius: 10,
            width: 320,
            boxShadow: "0px 2px 10px rgba(0,0,0,0.2)",
            fontSize: 12,
            maxHeight: "44vh",
            overflowY: "auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <b>Info</b>
            <button
              onClick={() => setSelectedPoint(null)}
              style={{
                padding: "5px 8px",
                border: "1px solid #ddd",
                borderRadius: 8,
                background: "white",
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              Clear
            </button>
          </div>

          {!selectedPoint ? (
            <div style={{ marginTop: 8, color: "#666" }}>Klik titik.</div>
          ) : selectedPoint.kind === "section" ? (
            (() => {
              const s = selectedPoint.data;
              return (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontWeight: 800 }}>NODE</div>
                  <div style={{ color: "#666", marginTop: 2 }}>
                    {s.latitude.toFixed(6)}, {s.longitude.toFixed(6)}
                  </div>

                  <div style={{ marginTop: 8, borderTop: "1px solid #eee", paddingTop: 8 }}>
                    <div style={{ color: COLOR_GI.stroke, fontWeight: 800 }}>GI ({s.giItems.length})</div>
                    <div style={{ marginTop: 6 }}>{renderItems(s.giItems, 8)}</div>
                  </div>

                  <div style={{ marginTop: 10, borderTop: "1px solid #eee", paddingTop: 8 }}>
                    <div style={{ color: COLOR_GH.stroke, fontWeight: 800 }}>GH ({s.ghItems.length})</div>
                    <div style={{ marginTop: 6 }}>{renderItems(s.ghItems, 8)}</div>
                  </div>

                  <div style={{ marginTop: 10, borderTop: "1px solid #eee", paddingTop: 8 }}>
                    <div style={{ color: COLOR_LBS.stroke, fontWeight: 800 }}>LBS ({s.lbsItems.length})</div>
                    <div style={{ marginTop: 6 }}>{renderItems(s.lbsItems, 8)}</div>
                  </div>

                  <div style={{ marginTop: 10, borderTop: "1px solid #eee", paddingTop: 8 }}>
                    <div style={{ color: COLOR_REC.stroke, fontWeight: 800 }}>REC ({s.recItems.length})</div>
                    <div style={{ marginTop: 6 }}>{renderItems(s.recItems, 8)}</div>
                  </div>
                </div>
              );
            })()
          ) : (
            (() => {
              const g = selectedPoint.data;
              return (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontWeight: 800 }}>TIANG</div>
                  <div style={{ color: "#666", marginTop: 2 }}>{fmtCoord(g.latitude, g.longitude)}</div>
                  <div style={{ marginTop: 6 }}>
                    ULP: <b>{g.ulp || "-"}</b>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* LEFT BOTTOM */}
      {!ssMode && (
        <div
          style={{
            position: "absolute",
            zIndex: 1000,
            bottom: 16,
            left: 16,
            background: "white",
            padding: 10,
            borderRadius: 10,
            width: 360,
            boxShadow: "0px 2px 10px rgba(0,0,0,0.2)",
            fontSize: 12,
            maxHeight: "46vh",
            overflowY: "auto",
          }}
        >
          <b>Garis</b>

          <div style={{ marginTop: 8, color: "#555", lineHeight: 1.4 }}>
            Jalur auto dari <b>SECTION A - B</b> jalan sendiri.
            <br />
            Garis manual tetap bisa dipakai.
            <br />
            Tiang <b>{poleInteractionLocked ? "dikunci" : "aktif"}</b> saat edit/hapus garis.
          </div>

          {/* EDIT GARIS */}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 800 }}>Edit Garis</div>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={editMode}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setEditMode(v);
                    if (!v) {
                      setDraftPts([]);
                      setEditingLineId(null);
                      setLineName("");
                      setLineColor("#000000");
                    }
                  }}
                />
                <span style={{ color: "#555" }}>ON</span>
              </label>
            </div>

            {editingLine ? (
              <div style={{ marginTop: 8, padding: 8, border: "1px solid #eee", borderRadius: 10, background: "#fafafa" }}>
                <div style={{ fontWeight: 900 }}>Sedang edit: {editingLine.name}</div>
                <button
                  onClick={cancelEditLine}
                  style={{
                    marginTop: 8,
                    width: "100%",
                    padding: 8,
                    border: "1px solid #ddd",
                    borderRadius: 10,
                    background: "white",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  Batal edit
                </button>
              </div>
            ) : null}

            <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
              <input type="checkbox" checked={deleteClickMode} onChange={(e) => setDeleteClickMode(e.target.checked)} />
              <span style={{ color: "#555" }}>Mode hapus (klik garis manual)</span>
            </label>

            <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
              <div style={{ width: 90, color: "#555" }}>Mode</div>
              <select
                value={routeMode}
                onChange={(e) => setRouteMode(e.target.value as RouteMode)}
                disabled={!editMode}
                style={{ flex: 1, padding: 6 }}
              >
                <option value="poles">Ikut tiang</option>
                <option value="road">Ikut jalan</option>
                <option value="straight">Lurus</option>
              </select>
            </div>

            {routeMode === "poles" && editMode ? (
              <details style={{ marginTop: 10 }}>
                <summary style={{ cursor: "pointer", fontWeight: 800, color: "#333" }}>Pengaturan ikut tiang</summary>

                <div style={{ marginTop: 10, color: "#777", fontSize: 11 }}>
                  Garis auto section juga pakai ini.
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                  <div style={{ width: 140, color: "#555" }}>Snap max (m)</div>
                  <input
                    type="number"
                    value={snapToPoleMaxMeters}
                    min={20}
                    max={1000}
                    onChange={(e) => setSnapToPoleMaxMeters(Number(e.target.value || 0))}
                    style={{ flex: 1, padding: 6, border: "1px solid #ddd", borderRadius: 6 }}
                  />
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                  <div style={{ width: 140, color: "#555" }}>Edge cutoff (m)</div>
                  <input
                    type="number"
                    value={poleEdgeCutoffMeters}
                    min={30}
                    max={800}
                    onChange={(e) => setPoleEdgeCutoffMeters(Number(e.target.value || 0))}
                    style={{ flex: 1, padding: 6, border: "1px solid #ddd", borderRadius: 6 }}
                  />
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                  <div style={{ width: 140, color: "#555" }}>K nearest</div>
                  <input
                    type="number"
                    value={poleKNearest}
                    min={2}
                    max={20}
                    onChange={(e) => setPoleKNearest(Number(e.target.value || 0))}
                    style={{ flex: 1, padding: 6, border: "1px solid #ddd", borderRadius: 6 }}
                  />
                </div>

                {!selectedUlp ? (
                  <div style={{ marginTop: 10, color: "#b71c1c", fontSize: 11 }}>
                    ⚠️ Mode ikut tiang butuh <b>pilih ULP</b> dulu.
                  </div>
                ) : null}
              </details>
            ) : null}

            <div style={{ marginTop: 8, color: "#777", fontSize: 11, lineHeight: 1.35 }}>
              {editMode ? (
                <>
                  Klik marker GI/GH/LBS/REC untuk tambah titik. Draft: <b>{draftPts.length}</b>
                </>
              ) : (
                <>Aktifkan ON untuk mulai nyambung titik.</>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
              <div style={{ width: 90, color: "#555" }}>Nama</div>
              <input
                value={lineName}
                onChange={(e) => setLineName(e.target.value)}
                placeholder="mis: GI1-LBS2"
                style={{ flex: 1, padding: 6, border: "1px solid #ddd", borderRadius: 6 }}
                disabled={!editMode}
              />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
              <div style={{ width: 90, color: "#555" }}>Warna</div>
              <input
                type="color"
                value={lineColor}
                onChange={(e) => setLineColor(e.target.value)}
                style={{ width: 48, height: 30, padding: 0, border: "1px solid #ddd", borderRadius: 6 }}
                disabled={!editMode}
              />
              <div style={{ marginLeft: "auto", color: "#555" }}>
                Draft: <b>{draftPts.length}</b>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                onClick={undoDraft}
                disabled={!editMode || draftPts.length === 0}
                style={{ flex: 1, padding: 8, border: "1px solid #ddd", borderRadius: 8, background: "white", cursor: "pointer" }}
              >
                Undo
              </button>
              <button
                onClick={clearDraft}
                disabled={!editMode || draftPts.length === 0}
                style={{ flex: 1, padding: 8, border: "1px solid #ddd", borderRadius: 8, background: "white", cursor: "pointer" }}
              >
                Clear
              </button>
            </div>

            <button
              onClick={saveOrUpdateLine}
              disabled={!editMode || draftPts.length < 2 || routingBusy}
              style={{
                width: "100%",
                marginTop: 10,
                padding: 10,
                border: "1px solid #ddd",
                borderRadius: 10,
                background: "white",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              {routingBusy ? "Routing..." : editingLineId ? "Update Line" : "Simpan Line"}
            </button>

            <div style={{ marginTop: 10, color: "#555" }}>
              Total line manual: <b>{savedLines.length}</b>
            </div>
          </div>

          {/* KELOLA GARIS */}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 800 }}>Kelola Garis Manual</div>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={manageLinesOn} onChange={(e) => setManageLinesOn(e.target.checked)} />
                <span style={{ color: "#555" }}>Aktif</span>
              </label>
            </div>

            {!manageLinesOn ? (
              <div style={{ marginTop: 8, color: "#777", fontSize: 11 }}>
                Nonaktif: daftar garis disembunyikan.
              </div>
            ) : savedLines.length === 0 ? (
              <div style={{ marginTop: 8, color: "#777", fontSize: 11 }}>Belum ada line manual.</div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                  <div style={{ fontWeight: 700, flex: 1, color: "#555" }}>Daftar</div>
                  <button
                    onClick={() => {
                      if (confirmDelete("SEMUA garis")) deleteAllLines();
                    }}
                    style={{
                      padding: "6px 10px",
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      background: "white",
                      cursor: "pointer",
                      fontSize: 11,
                    }}
                  >
                    Hapus Semua
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                  {savedLines.map((l) => (
                    <div key={l.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 12, height: 12, background: l.color, borderRadius: 3, border: "1px solid rgba(0,0,0,0.2)" }} />
                        <div style={{ fontWeight: 900, flex: 1 }}>{l.name}</div>

                        <button
                          onClick={() => startEditLine(l)}
                          style={{
                            padding: "4px 8px",
                            border: "1px solid #ddd",
                            borderRadius: 8,
                            background: "white",
                            cursor: "pointer",
                            fontSize: 11,
                          }}
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => toggleLineVisible(l.id)}
                          style={{
                            padding: "4px 8px",
                            border: "1px solid #ddd",
                            borderRadius: 8,
                            background: "white",
                            cursor: "pointer",
                            fontSize: 11,
                          }}
                        >
                          {l.visible ? "Sembunyikan" : "Tampilkan"}
                        </button>

                        <button
                          onClick={() => {
                            if (confirmDelete(l.name)) deleteLine(l.id);
                          }}
                          style={{
                            padding: "4px 8px",
                            border: "1px solid #ddd",
                            borderRadius: 8,
                            background: "white",
                            cursor: "pointer",
                            fontSize: 11,
                          }}
                        >
                          Hapus
                        </button>
                      </div>

                      <div style={{ marginTop: 4, color: "#666", fontSize: 11 }}>
                        Titik: <b>{l.points.length}</b> • mode:{" "}
                        <b>{l.routeMode === "poles" ? "tiang" : l.routeMode === "road" ? "jalan" : "lurus"}</b>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* RIGHT PANEL */}
      {!ssMode && (
        <div
          style={{
            position: "absolute",
            zIndex: 1000,
            top: 16,
            right: 16,
            background: "white",
            padding: 10,
            borderRadius: 10,
            width: 380,
            boxShadow: "0px 2px 10px rgba(0,0,0,0.2)",
            fontSize: 12,
            maxHeight: "calc(100vh - 32px)",
            overflowY: "auto",
          }}
        >
          <b>Panel</b>

          {/* ULP */}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee" }}>
            <div style={{ fontWeight: 800 }}>Tiang (pilih ULP)</div>

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                onClick={loadUlpList}
                style={{
                  padding: "7px 10px",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  background: "white",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Reload ULP
              </button>
              {ulpLoading ? <span style={{ color: "#777", fontSize: 11, alignSelf: "center" }}>loading…</span> : null}
            </div>

            <select value={selectedUlp} onChange={(e) => setSelectedUlp(e.target.value)} style={{ width: "100%", padding: 6, marginTop: 8 }}>
              <option value="">-- pilih ULP (untuk tiang) --</option>
              {ulpList.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>

            <div style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Base Map</div>
              <select value={selectedBase} onChange={(e) => setSelectedBase(e.target.value as any)} style={{ width: "100%", padding: 6 }}>
                <option value="normal">Normal</option>
                <option value="satellite">Satellite</option>
              </select>
            </div>

            {poleInteractionLocked ? (
              <div style={{ marginTop: 8, color: "#b71c1c", fontSize: 11 }}>
                Klik tiang nonaktif saat <b>Edit Garis</b> / <b>Mode hapus</b> aktif.
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: 10, color: "#444", lineHeight: 1.5 }}>
            Zoom: <b>{currentZoom}</b> • viewportOnly: <b>{viewportOnly ? "ON" : "OFF"}</b>
            <br />
            Network: {networkLoading ? "loading..." : "ok"} • node: <b>{networkNodesRaw.length}</b> • link: <b>{networkLinksRaw.length}</b>
            <br />
            Auto route section: <b>{autoRouteBusy ? "routing..." : "idle"}</b> • tampil: <b>{autoSectionLinesDisplayed.length}</b>
            <br />
            Tiang: {bundleLoading ? "loading..." : "ok"} • ULP: <b>{selectedUlp || "-"}</b> • pole: <b>{poleGroups.length}</b>
            {errMsg ? <div style={{ color: "#d32f2f", marginTop: 6 }}>{errMsg}</div> : null}
          </div>

          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee" }}>
            <div style={{ fontWeight: 800 }}>Screenshot</div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
              <input type="checkbox" checked={ssMode} onChange={(e) => setSsMode(e.target.checked)} />
              <span style={{ color: "#555" }}>Screenshot mode (hide kotak putih)</span>
            </label>
          </div>

          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee" }}>
            <div style={{ fontWeight: 800 }}>Anti-lag</div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
              <input type="checkbox" checked={viewportOnly} onChange={(e) => setViewportOnly(e.target.checked)} />
              <span style={{ color: "#555" }}>Render hanya area terlihat</span>
            </label>

            <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
              <div style={{ width: 150, color: "#555" }}>Max auto line tampil</div>
              <input
                type="number"
                value={maxAutoSectionDisplay}
                min={50}
                max={5000}
                onChange={(e) => setMaxAutoSectionDisplay(Number(e.target.value || 0))}
                style={{ flex: 1, padding: 6, border: "1px solid #ddd", borderRadius: 6 }}
              />
            </div>
          </div>

          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee" }}>
            <div style={{ fontWeight: 800 }}>Node GI / GH / LBS / REC</div>

            <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
              <input type="checkbox" checked={showSectionPoints} onChange={(e) => setShowSectionPoints(e.target.checked)} />
              <span style={{ color: "#555" }}>Tampilkan node</span>
            </label>

            <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
              <input type="checkbox" checked={showAutoSectionLines} onChange={(e) => setShowAutoSectionLines(e.target.checked)} />
              <span style={{ color: "#555" }}>Tampilkan jalur auto dari SECTION (A - B)</span>
            </label>

            <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
              <div style={{ width: 110, color: "#555" }}>Filter</div>
              <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value as any)} style={{ flex: 1, padding: 6 }}>
                <option value="all">Semua</option>
                <option value="gi">GI saja</option>
                <option value="gh">GH saja</option>
                <option value="lbs">LBS saja</option>
                <option value="rec">REC saja</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
              <div style={{ width: 110, color: "#555" }}>Max node</div>
              <input
                type="number"
                value={maxSectionDisplay}
                min={50}
                max={50000}
                onChange={(e) => setMaxSectionDisplay(Number(e.target.value || 0))}
                style={{ flex: 1, padding: 6, border: "1px solid #ddd", borderRadius: 6 }}
              />
            </div>

            <div style={{ marginTop: 10, color: "#555", lineHeight: 1.5 }}>
              Node unik: <b>{sectionStats.titikUnik}</b> • tampil: <b>{sectionStats.shown}</b>
              <br />
              GI <b>{sectionStats.giItems}</b> • GH <b>{sectionStats.ghItems}</b> • LBS <b>{sectionStats.lbsItems}</b> • REC <b>{sectionStats.recItems}</b>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                onClick={() => gotoSectionIndex(secIdx - 1)}
                disabled={!sectionMarkersDisplayed.length}
                style={{ flex: 1, padding: 8, border: "1px solid #ddd", borderRadius: 8, background: "white", cursor: "pointer" }}
              >
                Prev
              </button>
              <button
                onClick={() => gotoSectionIndex(secIdx + 1)}
                disabled={!sectionMarkersDisplayed.length}
                style={{ flex: 1, padding: 8, border: "1px solid #ddd", borderRadius: 8, background: "white", cursor: "pointer" }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      <MapContainer
        center={[-5.33, 119.41]}
        zoom={11}
        preferCanvas
        style={{ height: "100%", width: "100%" }}
        zoomControl={!ssMode}
        attributionControl={!ssMode}
      >
        <MapSetter onReady={setMap} />

        {selectedBase === "normal" ? (
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
        ) : (
          <TileLayer url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" maxZoom={20} />
        )}

        {/* AUTO SECTION LINES */}
        {showAutoSectionLines &&
          autoSectionLinesDisplayed.map((l) => (
            <Polyline
              key={`auto-${l.id}`}
              positions={l.path as any}
              pathOptions={{
                color: "#ff9800",
                weight: 3,
                opacity: 0.9,
                dashArray: "8 8",
              }}
            >
              {!ssMode && autoLineTooltipEnabled ? (
                <Tooltip sticky direction="top" opacity={1}>
                  <div style={{ fontSize: 12, minWidth: 220 }}>
                    <div style={{ fontWeight: 800 }}>{l.section}</div>
                    <div style={{ marginTop: 4 }}>
                      {l.fromKategori} <b>{l.fromName}</b>
                    </div>
                    <div>
                      {l.toKategori} <b>{l.toName}</b>
                    </div>
                  </div>
                </Tooltip>
              ) : null}
            </Polyline>
          ))}

        {/* SAVED MANUAL LINES */}
        {savedLines
          .filter((l) => l.visible && l.path.length >= 2)
          .map((l) => (
            <Polyline
              key={l.id}
              positions={l.path as any}
              pathOptions={{ color: l.color, weight: 4, opacity: 0.9 }}
              eventHandlers={{
                click: () => {
                  if (!deleteClickMode) return;
                  if (confirmDelete(l.name)) deleteLine(l.id);
                },
              }}
            />
          ))}

        {/* DRAFT LINE */}
        {draftPts.length >= 2 && (
          <Polyline
            positions={draftPts.map((p) => [p.lat, p.lng]) as any}
            pathOptions={{ color: lineColor, weight: 4, opacity: 0.75 }}
          />
        )}

        {/* GI/GH/LBS/REC NODES */}
        {canShowSections &&
          (sectionsUseCanvas
            ? sectionMarkersDisplayed.map((s) => {
                const baseLat = s.latitude;
                const baseLng = s.longitude;

                const nodes = [
                  { kind: "GI" as NodeKategori, count: s.giItems.length, lat: baseLat, lng: baseLng, color: COLOR_GI },
                  { kind: "GH" as NodeKategori, count: s.ghItems.length, lat: baseLat + 0.00005, lng: baseLng - 0.00005, color: COLOR_GH },
                  { kind: "LBS" as NodeKategori, count: s.lbsItems.length, lat: baseLat, lng: baseLng + 0.00006, color: COLOR_LBS },
                  { kind: "REC" as NodeKategori, count: s.recItems.length, lat: baseLat + 0.00006, lng: baseLng + 0.00006, color: COLOR_REC },
                ].filter((x) => x.count > 0);

                return (
                  <Fragment key={`secC-wrap-${s.key}`}>
                    {nodes.map((m) => (
                      <CircleMarker
                        key={`${m.kind}-${s.key}`}
                        center={[m.lat, m.lng]}
                        radius={sectionCanvasRadius}
                        pathOptions={{
                          color: m.color.stroke,
                          weight: canvasStrokeWeight,
                          fillColor: m.color.fill,
                          fillOpacity: 0.9,
                        }}
                        eventHandlers={{
                          click: () => onClickNode(s, m.lat, m.lng, m.kind),
                        }}
                      />
                    ))}
                  </Fragment>
                );
              })
            : sectionMarkersDisplayed.map((s) => {
                const baseLat = s.latitude;
                const baseLng = s.longitude;

                const markers: Array<{
                  key: string;
                  pos: [number, number];
                  icon: DivIcon;
                  title: NodeKategori;
                }> = [];

                if (s.giItems.length > 0) {
                  markers.push({
                    key: `gi-${s.key}`,
                    pos: [baseLat, baseLng],
                    icon: iconGi,
                    title: "GI",
                  });
                }

                if (s.ghItems.length > 0) {
                  markers.push({
                    key: `gh-${s.key}`,
                    pos: [baseLat + 0.00005, baseLng - 0.00005],
                    icon: iconGh,
                    title: "GH",
                  });
                }

                if (s.lbsItems.length > 0) {
                  markers.push({
                    key: `lbs-${s.key}`,
                    pos: [baseLat, baseLng + 0.00006],
                    icon: iconLbs,
                    title: "LBS",
                  });
                }

                if (s.recItems.length > 0) {
                  markers.push({
                    key: `rec-${s.key}`,
                    pos: [baseLat + 0.00006, baseLng + 0.00006],
                    icon: iconRec,
                    title: "REC",
                  });
                }

                return markers.map((m) => (
                  <Marker
                    key={m.key}
                    position={m.pos}
                    icon={m.icon}
                    eventHandlers={{
                      click: () => onClickNode(s, m.pos[0], m.pos[1], m.title),
                    }}
                  >
                    {!ssMode && (
                      <Tooltip sticky direction="top" opacity={1}>
                        <div style={{ fontSize: 12, minWidth: 180 }}>
                          <div style={{ fontWeight: 700 }}>{m.title}</div>
                          <div style={{ marginTop: 4, color: "#666" }}>{fmtCoord(baseLat, baseLng)}</div>
                          <div style={{ marginTop: 6 }}>
                            GI <b>{s.giItems.length}</b> • GH <b>{s.ghItems.length}</b> • LBS <b>{s.lbsItems.length}</b> • REC <b>{s.recItems.length}</b>
                          </div>
                        </div>
                      </Tooltip>
                    )}
                  </Marker>
                ));
              }))}

        {/* POLES */}
        {canShowPoles &&
          (polesUseCanvas
            ? poleGroupsDisplayed.map((g) => (
                <CircleMarker
                  key={`pC-${g.key}`}
                  center={[g.latitude, g.longitude]}
                  radius={poleCanvasRadius}
                  pathOptions={{
                    color: COLOR_TIANG.stroke,
                    weight: canvasStrokeWeight,
                    fillColor: COLOR_TIANG.fill,
                    fillOpacity: 0.9,
                  }}
                  eventHandlers={
                    poleInteractionLocked
                      ? undefined
                      : {
                          click: () => {
                            setSelectedPoint({ kind: "pole", data: g });
                            focusTo(g.latitude, g.longitude);
                          },
                        }
                  }
                />
              ))
            : poleGroupsDisplayed.map((g) => (
                <Marker
                  key={g.key}
                  position={[g.latitude, g.longitude]}
                  icon={iconTiang}
                  eventHandlers={
                    poleInteractionLocked
                      ? undefined
                      : {
                          click: () => {
                            setSelectedPoint({ kind: "pole", data: g });
                            focusTo(g.latitude, g.longitude);
                          },
                        }
                  }
                >
                  {!ssMode && (
                    <Tooltip sticky direction="top" opacity={1}>
                      <div style={{ fontSize: 12, minWidth: 180 }}>
                        <div style={{ fontWeight: 700 }}>TIANG</div>
                        <div style={{ marginTop: 4, color: "#666" }}>{fmtCoord(g.latitude, g.longitude)}</div>
                        <div style={{ marginTop: 6 }}>
                          ULP: <b>{g.ulp || "-"}</b>
                        </div>
                      </div>
                    </Tooltip>
                  )}
                </Marker>
              )))}
      </MapContainer>
    </div>
  );
}