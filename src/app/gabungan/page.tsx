"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { divIcon, type DivIcon, type Map as LeafletMap } from "leaflet";
import { useMap } from "react-leaflet";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then((m) => m.CircleMarker), { ssr: false });
const Tooltip = dynamic(() => import("react-leaflet").then((m) => m.Tooltip), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false });

const BUNDLE_URL =
  "https://script.google.com/macros/s/AKfycbz7DPwE1bcVqtEPjh4vxKkjKdG-nipMyw7wMbpBRt29DtBhEOzu3nlAc22zg9mudJ8ojA/exec";

const UP3 = "MAKASSAR SELATAN";
const DEDUP_DECIMALS = 6;

type NodeKategori = "GH" | "LBS" | "REC";
type RoutePreference = "auto" | "kanan" | "kiri" | "atas" | "bawah";

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

type PoleGroup = {
  key: string;
  latitude: number;
  longitude: number;
  ulp: string;
  rowIds: number[];
  owners: string[];
  address: string;
};

type NodePointRaw = {
  rowId: number;
  kategori: NodeKategori;
  keypoint: string;
  ulp: string;
  up3: string;
  status: string;
  latitude: number;
  longitude: number;
};

type NodeGroup = {
  key: string;
  kategori: NodeKategori;
  latitude: number;
  longitude: number;
  items: NodePointRaw[];
};

type LineEndpoint = {
  rowId: number;
  kategori: NodeKategori;
  keypoint: string;
  ulp: string;
  up3: string;
  status: string;
  latitude: number;
  longitude: number;
};

type ManualLine = {
  id: string;
  rowId: number;
  up3: string;
  ulp: string;
  pertemuan: string;
  kms: string;
  matchedPoleCount?: number;
  inferDistanceMeters?: number;

  fromName: string;
  fromKategori: NodeKategori;
  fromUlp: string;
  fromLat: number;
  fromLng: number;

  toName: string;
  toKategori: NodeKategori;
  toUlp: string;
  toLat: number;
  toLng: number;

  createdAt: string;
  updatedAt: string;
};

type SelectedPoint =
  | { kind: "pole"; data: PoleGroup }
  | { kind: "node"; data: NodeGroup };

type DraftLine = {
  kms: string;
  from: LineEndpoint | null;
  to: LineEndpoint | null;
};

type PickMode = null | "draft_from" | "draft_to" | "edit_from" | "edit_to";

type JsonResponse<T = any> = T & {
  success?: boolean;
  error?: string;
};

type PoleNeighbor = {
  idx: number;
  dist: number;
};

const ULP_ALIAS_MAP: Record<string, string[]> = {
  "ULP.32111": ["PANAKKUKANG", "PANAKKUKANG - MATTOANGIN"],
};

const COLOR_TIANG = { stroke: "#1565c0", fill: "#1e88e5" };
const COLOR_GH = { stroke: "#111111", fill: "#424242" };
const COLOR_LBS = { stroke: "#ad1457", fill: "#e91e63" };
const COLOR_REC = { stroke: "#2e7d32", fill: "#43a047" };
const COLOR_MANUAL_LINE = "#e53935";
const COLOR_SELECTED_LINE = "#1e88e5";
const COLOR_DRAFT_LINE = "#fb8c00";

let __jsonpMutex: Promise<any> = Promise.resolve();
let __jsonpSeq = 0;

function jsonp<T>(url: string, params: Record<string, string>, timeoutMs = 60000): Promise<T> {
  const runOnce = () =>
    new Promise<T>((resolve, reject) => {
      const cbName = `__w9_jsonp_${Date.now()}_${++__jsonpSeq}`;
      const script = document.createElement("script");
      script.async = true;

      let finished = false;

      const cleanup = () => {
        if (script.parentNode) script.parentNode.removeChild(script);
        try {
          delete (window as any)[cbName];
        } catch {
          (window as any)[cbName] = undefined;
        }
      };

      const timer = window.setTimeout(() => {
        if (finished) return;
        finished = true;
        cleanup();
        reject(new Error("JSONP timeout"));
      }, timeoutMs);

      (window as any)[cbName] = (data: T) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        cleanup();
        resolve(data);
      };

      const qp = new URLSearchParams({
        ...params,
        callback: cbName,
        _ts: String(Date.now()),
      }).toString();

      script.src = `${url}${url.includes("?") ? "&" : "?"}${qp}`;

      script.onerror = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
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

function fmtCoord(lat: number, lng: number) {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function uniqArr(arr: string[]) {
  return Array.from(new Set(arr.map((x) => String(x || "").trim()).filter(Boolean)));
}

function normCompact(s: string) {
  return String(s || "").toLowerCase().replace(/[\s._\-\/\\]/g, "").trim();
}

function normUlp(s: string) {
  let t = String(s || "").toLowerCase().replace(/[\s._\-\/\\]/g, "").trim();
  t = t.replace(/^ulp/, "");
  return t;
}

function ulpDigits(s: string) {
  return String(s || "").replace(/\D/g, "");
}

function getUlpAliases(ulpParam: string) {
  const raw = String(ulpParam || "").trim();
  if (!raw) return [];

  const out: string[] = [];
  const add = (x: string) => {
    const v = String(x || "").trim();
    if (v) out.push(v);
  };

  add(raw);
  add(raw.replace(/^ULP\./i, "").trim());
  add(raw.replace(/^ULP/i, "").trim());

  const rawNorm = normUlp(raw);
  const rawDigits = ulpDigits(raw);
  const rawCompact = normCompact(raw);

  Object.keys(ULP_ALIAS_MAP).forEach((key) => {
    const vals = [key, ...(ULP_ALIAS_MAP[key] || [])];
    const matched = vals.some((v) => {
      return (
        (rawNorm && normUlp(v) && rawNorm === normUlp(v)) ||
        (rawDigits && ulpDigits(v) && rawDigits === ulpDigits(v)) ||
        (rawCompact && normCompact(v) && rawCompact === normCompact(v)) ||
        raw.toLowerCase().trim() === String(v).toLowerCase().trim()
      );
    });

    if (matched) vals.forEach(add);
  });

  return uniqArr(out);
}

function ulpMatchesAnyAlias(cellValue: string, aliases: string[]) {
  if (!aliases.length) return true;

  const cellRaw = String(cellValue || "").trim();
  const cellNorm = normUlp(cellRaw);
  const cellDigits = ulpDigits(cellRaw);
  const cellCompact = normCompact(cellRaw);

  return aliases.some((a) => {
    const aNorm = normUlp(a);
    const aDigits = ulpDigits(a);
    const aCompact = normCompact(a);

    return (
      (aNorm && cellNorm && aNorm === cellNorm) ||
      (aDigits && cellDigits && aDigits === cellDigits) ||
      (aCompact && cellCompact && aCompact === cellCompact) ||
      cellRaw.toLowerCase().trim() === String(a).toLowerCase().trim()
    );
  });
}

function nodeSearchText(n: NodePointRaw) {
  return [n.kategori, n.keypoint, n.status, n.ulp, n.up3].join(" ").toLowerCase();
}

function makeEndpointFromGroup(group: NodeGroup): LineEndpoint {
  const it = group.items[0];
  return {
    rowId: it.rowId,
    kategori: it.kategori,
    keypoint: it.keypoint,
    ulp: it.ulp,
    up3: it.up3,
    status: it.status,
    latitude: group.latitude,
    longitude: group.longitude,
  };
}

function sameEndpoint(a: LineEndpoint | null, b: LineEndpoint | null) {
  if (!a || !b) return false;
  return Math.abs(a.latitude - b.latitude) < 1e-9 && Math.abs(a.longitude - b.longitude) < 1e-9;
}

function buildLineName(from: LineEndpoint | null, to: LineEndpoint | null) {
  if (!from || !to) return "";
  return `${from.keypoint} - ${to.keypoint}`;
}

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

function emptyDraftLine(): DraftLine {
  return {
    kms: "",
    from: null,
    to: null,
  };
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function nearestPoleIndex(lat: number, lng: number, poles: PoleGroup[]) {
  let bestIdx = -1;
  let bestDist = Number.POSITIVE_INFINITY;

  for (let i = 0; i < poles.length; i++) {
    const d = haversineMeters(lat, lng, poles[i].latitude, poles[i].longitude);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }

  return { idx: bestIdx, dist: bestDist };
}

function dedupeLatLng(points: number[][]) {
  const out: number[][] = [];
  for (const p of points) {
    if (!out.length) {
      out.push(p);
      continue;
    }
    const last = out[out.length - 1];
    if (Math.abs(last[0] - p[0]) > 1e-9 || Math.abs(last[1] - p[1]) > 1e-9) {
      out.push(p);
    }
  }
  return out;
}

function directionalPenaltyMeters(a: PoleGroup, b: PoleGroup, prefer: RoutePreference) {
  if (prefer === "auto") return 0;

  const avgLat = (a.latitude + b.latitude) / 2;
  const cosLat = Math.cos((avgLat * Math.PI) / 180);

  const dx = (b.longitude - a.longitude) * 111320 * cosLat;
  const dy = (b.latitude - a.latitude) * 110540;

  if (prefer === "kanan") {
    return (dx < 0 ? Math.abs(dx) * 4 : 0) + Math.abs(dy) * 0.2;
  }
  if (prefer === "kiri") {
    return (dx > 0 ? Math.abs(dx) * 4 : 0) + Math.abs(dy) * 0.2;
  }
  if (prefer === "atas") {
    return (dy < 0 ? Math.abs(dy) * 4 : 0) + Math.abs(dx) * 0.2;
  }
  if (prefer === "bawah") {
    return (dy > 0 ? Math.abs(dy) * 4 : 0) + Math.abs(dx) * 0.2;
  }

  return 0;
}

function buildAdjacencyFromNeighborMap(
  neighborMap: PoleNeighbor[][],
  thresholdMeters: number,
  poles: PoleGroup[],
  prefer: RoutePreference
) {
  const adj: Array<Array<{ to: number; w: number }>> = Array.from(
    { length: neighborMap.length },
    () => []
  );

  for (let i = 0; i < neighborMap.length; i++) {
    for (const n of neighborMap[i]) {
      if (n.dist <= thresholdMeters) {
        const penalty = directionalPenaltyMeters(poles[i], poles[n.idx], prefer);
        adj[i].push({ to: n.idx, w: n.dist + penalty });
        adj[n.idx].push({ to: i, w: n.dist + directionalPenaltyMeters(poles[n.idx], poles[i], prefer) });
      }
    }
  }

  return adj;
}

function dijkstraPath(
  adj: Array<Array<{ to: number; w: number }>>,
  startIdx: number,
  endIdx: number
) {
  const n = adj.length;
  const dist = Array(n).fill(Number.POSITIVE_INFINITY);
  const prev = Array(n).fill(-1);
  const used = Array(n).fill(false);

  dist[startIdx] = 0;

  for (let step = 0; step < n; step++) {
    let v = -1;
    let best = Number.POSITIVE_INFINITY;

    for (let i = 0; i < n; i++) {
      if (!used[i] && dist[i] < best) {
        best = dist[i];
        v = i;
      }
    }

    if (v === -1) break;
    if (v === endIdx) break;

    used[v] = true;

    for (const e of adj[v]) {
      const nd = dist[v] + e.w;
      if (nd < dist[e.to]) {
        dist[e.to] = nd;
        prev[e.to] = v;
      }
    }
  }

  if (!Number.isFinite(dist[endIdx])) return null;

  const path: number[] = [];
  let cur = endIdx;
  while (cur !== -1) {
    path.push(cur);
    cur = prev[cur];
  }
  path.reverse();
  return path;
}

function buildPolePolylinePositions(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  poles: PoleGroup[],
  neighborMap: PoleNeighbor[][],
  prefer: RoutePreference
) {
  const direct = [
    [fromLat, fromLng],
    [toLat, toLng],
  ];

  if (!poles.length || !neighborMap.length) return direct;

  const start = nearestPoleIndex(fromLat, fromLng, poles);
  const end = nearestPoleIndex(toLat, toLng, poles);

  if (start.idx === -1 || end.idx === -1) return direct;
  if (start.dist > 180 || end.dist > 180) return direct;

  if (start.idx === end.idx) {
    return dedupeLatLng([
      [fromLat, fromLng],
      [poles[start.idx].latitude, poles[start.idx].longitude],
      [toLat, toLng],
    ]);
  }

  const thresholds = [35, 50, 70, 90, 120, 160, 220];

  for (const th of thresholds) {
    const adj = buildAdjacencyFromNeighborMap(neighborMap, th, poles, prefer);
    const polePath = dijkstraPath(adj, start.idx, end.idx);
    if (!polePath || polePath.length < 2) continue;

    const pts: number[][] = [[fromLat, fromLng]];
    for (const idx of polePath) {
      pts.push([poles[idx].latitude, poles[idx].longitude]);
    }
    pts.push([toLat, toLng]);

    return dedupeLatLng(pts);
  }

  return direct;
}

export default function MapsPage() {
  const [mounted, setMounted] = useState(false);
  const [map, setMap] = useState<LeafletMap | null>(null);

  const [selectedBase, setSelectedBase] = useState<"normal" | "satellite">("normal");
  const [ssMode, setSsMode] = useState(false);

  const [ulpList, setUlpList] = useState<string[]>([]);
  const [selectedUlp, setSelectedUlp] = useState("");
  const [polesRaw, setPolesRaw] = useState<PolePointRaw[]>([]);
  const [nodesRaw, setNodesRaw] = useState<NodePointRaw[]>([]);
  const [manualLines, setManualLines] = useState<ManualLine[]>([]);

  const [ulpLoading, setUlpLoading] = useState(false);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [nodesLoading, setNodesLoading] = useState(false);
  const [linesLoading, setLinesLoading] = useState(false);
  const [lineBusy, setLineBusy] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [lineEditDraft, setLineEditDraft] = useState<ManualLine | null>(null);

  const [nodeSearch, setNodeSearch] = useState("");
  const [viewportOnly, setViewportOnly] = useState(true);
  const [currentZoom, setCurrentZoom] = useState(11);

  const [editMode, setEditMode] = useState(false);
  const [pickMode, setPickMode] = useState<PickMode>(null);
  const [editorMsg, setEditorMsg] = useState("");
  const [draftLine, setDraftLine] = useState<DraftLine | null>(null);
  const [routePreference, setRoutePreference] = useState<RoutePreference>("auto");

  const boundsRef = useRef<any>(null);
  const [boundsVersion, setBoundsVersion] = useState(0);

  const iconGH = useMemo(() => makePinIcon("G", COLOR_GH, 30), []);
  const iconLBS = useMemo(() => makePinIcon("L", COLOR_LBS, 30), []);
  const iconREC = useMemo(() => makePinIcon("R", COLOR_REC, 30), []);

  const poleIconSize = useMemo(() => {
    const size = 34 - (currentZoom - 10) * 0.9;
    return Math.max(22, Math.min(34, Math.round(size)));
  }, [currentZoom]);

  const iconTiang = useMemo(() => makePoleIcon(COLOR_TIANG, poleIconSize), [poleIconSize]);

  const poleCanvasRadius = useMemo(() => {
    const r = 4.0 - (currentZoom - 10) * 0.18;
    return Math.max(2.4, Math.min(4.0, r));
  }, [currentZoom]);

  const nodeCanvasRadius = useMemo(() => {
    const r = 3.2 - (currentZoom - 10) * 0.18;
    return Math.max(1.8, Math.min(3.2, r));
  }, [currentZoom]);

  useEffect(() => setMounted(true), []);

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
      map.flyTo([lat, lng] as any, Math.max(map.getZoom(), 15), {
        animate: true,
        duration: 0.35,
      } as any);
    },
    [map]
  );

  const fitLine = useCallback(
    (line: ManualLine) => {
      if (!map) return;
      map.fitBounds(
        [
          [line.fromLat, line.fromLng],
          [line.toLat, line.toLng],
        ] as any,
        { padding: [60, 60] as any }
      );
    },
    [map]
  );

  const loadUlpList = useCallback(async () => {
    try {
      setUlpLoading(true);
      setErrMsg("");
      const resp: JsonResponse<{ ulps: string[] }> = await jsonp(BUNDLE_URL, { mode: "ulplist", up3: UP3 });
      if (!resp?.success || !Array.isArray(resp.ulps)) throw new Error(resp?.error || "ulplist gagal");
      setUlpList(resp.ulps);
    } catch (e: any) {
      setErrMsg("Gagal load ULP list: " + String(e?.message || e));
      setUlpList([]);
    } finally {
      setUlpLoading(false);
    }
  }, []);

  const loadManualLines = useCallback(async () => {
    try {
      setLinesLoading(true);
      const resp: JsonResponse<{ lines: ManualLine[] }> = await jsonp(BUNDLE_URL, { mode: "lines_list", up3: UP3 });
      if (!resp?.success || !Array.isArray(resp.lines)) throw new Error(resp?.error || "lines_list gagal");

      setManualLines(
        resp.lines.filter(
          (x) =>
            Number.isFinite(Number(x.fromLat)) &&
            Number.isFinite(Number(x.fromLng)) &&
            Number.isFinite(Number(x.toLat)) &&
            Number.isFinite(Number(x.toLng))
        )
      );
    } catch (e: any) {
      setErrMsg("Gagal load garis tersimpan: " + String(e?.message || e));
      setManualLines([]);
    } finally {
      setLinesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUlpList();
    loadManualLines();
  }, [loadUlpList, loadManualLines]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setNodesLoading(true);
        const resp: JsonResponse<{ nodes: NodePointRaw[] }> = await jsonp(BUNDLE_URL, { mode: "nodes", up3: UP3 }, 90000);
        if (!resp?.success || !Array.isArray(resp.nodes)) throw new Error(resp?.error || "nodes gagal");

        const arr = resp.nodes
          .map((x: any) => ({
            rowId: Number(x?.rowId || 0),
            kategori: String(x?.kategori || "").toUpperCase() as NodeKategori,
            keypoint: String(x?.keypoint || ""),
            ulp: String(x?.ulp || ""),
            up3: String(x?.up3 || ""),
            status: String(x?.status || ""),
            latitude: Number(x?.latitude),
            longitude: Number(x?.longitude),
          }))
          .filter(
            (x) =>
              (x.kategori === "GH" || x.kategori === "LBS" || x.kategori === "REC") &&
              Number.isFinite(x.latitude) &&
              Number.isFinite(x.longitude)
          );

        if (!cancelled) setNodesRaw(arr);
      } catch (e: any) {
        if (!cancelled) {
          setErrMsg("Gagal load GH/LBS/REC: " + String(e?.message || e));
          setNodesRaw([]);
        }
      } finally {
        if (!cancelled) setNodesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!selectedUlp) {
        setPolesRaw([]);
        return;
      }

      try {
        setBundleLoading(true);
        const resp: JsonResponse<{ poles: PolePointRaw[] }> = await jsonp(
          BUNDLE_URL,
          { mode: "bundle", ulp: selectedUlp, up3: UP3 },
          90000
        );

        if (!resp?.success || !Array.isArray(resp.poles)) throw new Error(resp?.error || "bundle gagal");
        if (!cancelled) setPolesRaw(resp.poles);
      } catch (e: any) {
        if (!cancelled) {
          setErrMsg("Gagal load tiang: " + String(e?.message || e));
          setPolesRaw([]);
        }
      } finally {
        if (!cancelled) setBundleLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedUlp]);

  useEffect(() => {
    if (!selectedLineId) {
      setLineEditDraft(null);
      return;
    }
    const found = manualLines.find((x) => x.id === selectedLineId) || null;
    setLineEditDraft(found ? { ...found } : null);
  }, [selectedLineId, manualLines]);

  const poleGroups = useMemo(() => {
    const m = new Map<string, PoleGroup>();

    for (const p of polesRaw) {
      const lat = Number(p.latitude);
      const lng = Number(p.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const k = coordKey(lat, lng);
      const prev = m.get(k);

      if (!prev) {
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
        prev.rowIds.push(p.rowId);
        if (p.owner && !prev.owners.includes(String(p.owner))) prev.owners.push(String(p.owner));
        if (!prev.address) prev.address = p.formattedAddress || p.streetAddress || "";
      }
    }

    return Array.from(m.values());
  }, [polesRaw, selectedUlp]);

  const poleNeighborMap = useMemo<PoleNeighbor[][]>(() => {
    if (!poleGroups.length) return [];

    const out: PoleNeighbor[][] = Array.from({ length: poleGroups.length }, () => []);

    for (let i = 0; i < poleGroups.length; i++) {
      const arr: PoleNeighbor[] = [];

      for (let j = 0; j < poleGroups.length; j++) {
        if (i === j) continue;

        const d = haversineMeters(
          poleGroups[i].latitude,
          poleGroups[i].longitude,
          poleGroups[j].latitude,
          poleGroups[j].longitude
        );

        arr.push({ idx: j, dist: d });
      }

      arr.sort((a, b) => a.dist - b.dist);
      out[i] = arr.slice(0, 8);
    }

    return out;
  }, [poleGroups]);

  const nodeGroupsAll = useMemo(() => {
    const m = new Map<string, NodeGroup>();

    for (const n of nodesRaw) {
      const k = `${n.kategori}|${coordKey(n.latitude, n.longitude)}`;
      const prev = m.get(k);

      if (!prev) {
        m.set(k, {
          key: k,
          kategori: n.kategori,
          latitude: Number(n.latitude.toFixed(DEDUP_DECIMALS)),
          longitude: Number(n.longitude.toFixed(DEDUP_DECIMALS)),
          items: [n],
        });
      } else {
        prev.items.push(n);
      }
    }

    return Array.from(m.values());
  }, [nodesRaw]);

  const nodeGroupsFiltered = useMemo(() => {
    const q = nodeSearch.trim().toLowerCase();
    if (!q) return nodeGroupsAll;
    return nodeGroupsAll.filter((g) => g.items.some((it) => nodeSearchText(it).includes(q)));
  }, [nodeGroupsAll, nodeSearch]);

  const poleGroupsDisplayed = useMemo(() => {
    let list = poleGroups;
    const b = viewportOnly ? boundsRef.current : null;
    if (b) list = list.filter((p) => b.contains([p.latitude, p.longitude] as any));
    return list;
  }, [poleGroups, viewportOnly, boundsVersion]);

  const nodeGroupsDisplayed = useMemo(() => {
    let list = nodeGroupsFiltered;
    const b = viewportOnly ? boundsRef.current : null;
    if (b) list = list.filter((n) => b.contains([n.latitude, n.longitude] as any));
    return list;
  }, [nodeGroupsFiltered, viewportOnly, boundsVersion]);

  const manualLinesFilteredByUlp = useMemo(() => {
    if (!selectedUlp) return manualLines;
    const aliases = getUlpAliases(selectedUlp);
    return manualLines.filter(
      (l) => ulpMatchesAnyAlias(l.fromUlp, aliases) || ulpMatchesAnyAlias(l.toUlp, aliases) || ulpMatchesAnyAlias(l.ulp, aliases)
    );
  }, [manualLines, selectedUlp]);

  const manualLinesDisplayed = useMemo(() => {
    let list = manualLinesFilteredByUlp;
    const b = viewportOnly ? boundsRef.current : null;

    if (b) {
      list = list.filter(
        (l) =>
          b.contains([l.fromLat, l.fromLng] as any) ||
          b.contains([l.toLat, l.toLng] as any)
      );
    }
    return list;
  }, [manualLinesFilteredByUlp, viewportOnly, boundsVersion]);

  const draftLinePath = useMemo(() => {
    if (!draftLine?.from || !draftLine?.to) return null;

    return buildPolePolylinePositions(
      draftLine.from.latitude,
      draftLine.from.longitude,
      draftLine.to.latitude,
      draftLine.to.longitude,
      poleGroups,
      poleNeighborMap,
      routePreference
    );
  }, [draftLine, poleGroups, poleNeighborMap, routePreference]);

  const manualLinePathMap = useMemo(() => {
    const m = new Map<string, number[][]>();

    for (const l of manualLinesDisplayed) {
      m.set(
        l.id,
        buildPolePolylinePositions(
          l.fromLat,
          l.fromLng,
          l.toLat,
          l.toLng,
          poleGroups,
          poleNeighborMap,
          routePreference
        )
      );
    }

    return m;
  }, [manualLinesDisplayed, poleGroups, poleNeighborMap, routePreference]);

  const stats = useMemo(() => {
    const out = { GH: 0, LBS: 0, REC: 0 };
    nodesRaw.forEach((n) => {
      if (n.kategori === "GH") out.GH++;
      if (n.kategori === "LBS") out.LBS++;
      if (n.kategori === "REC") out.REC++;
    });
    return out;
  }, [nodesRaw]);

  const colorByKategori = useCallback((k: NodeKategori) => {
    if (k === "GH") return COLOR_GH;
    if (k === "LBS") return COLOR_LBS;
    return COLOR_REC;
  }, []);

  const iconByKategori = useCallback(
    (k: NodeKategori) => {
      if (k === "GH") return iconGH;
      if (k === "LBS") return iconLBS;
      return iconREC;
    },
    [iconGH, iconLBS, iconREC]
  );

  const handleNodePickedForEditor = useCallback(
    (group: NodeGroup) => {
      if (!editMode) return;

      const endpoint = makeEndpointFromGroup(group);

      if (!selectedLineId && (pickMode === null || pickMode === "draft_from")) {
        if (!selectedUlp && endpoint.ulp) {
          setSelectedUlp(endpoint.ulp);
        }

        setDraftLine((prev) => ({
          ...(prev || emptyDraftLine()),
          from: endpoint,
          to: prev?.to && sameEndpoint(prev.to, endpoint) ? null : prev?.to || null,
        }));
        setPickMode("draft_to");
        setEditorMsg("Titik awal dipilih. Klik titik akhir.");
        return;
      }

      if (!selectedLineId && pickMode === "draft_to") {
        setDraftLine((prev) => {
          const base = prev || emptyDraftLine();
          if (base.from && sameEndpoint(base.from, endpoint)) {
            setEditorMsg("Titik awal dan titik akhir tidak boleh sama.");
            return base;
          }
          return { ...base, to: endpoint };
        });
        setPickMode(null);
        setEditorMsg("Titik akhir dipilih. Isi jarak KMS lalu simpan.");
        return;
      }

      if (selectedLineId && pickMode === "edit_from") {
        setLineEditDraft((prev) => {
          if (!prev) return prev;
          if (Math.abs(prev.toLat - endpoint.latitude) < 1e-9 && Math.abs(prev.toLng - endpoint.longitude) < 1e-9) {
            setEditorMsg("Titik awal dan titik akhir tidak boleh sama.");
            return prev;
          }
          return {
            ...prev,
            fromName: endpoint.keypoint,
            fromKategori: endpoint.kategori,
            fromUlp: endpoint.ulp,
            fromLat: endpoint.latitude,
            fromLng: endpoint.longitude,
            pertemuan: `${endpoint.keypoint} - ${prev.toName}`,
            updatedAt: new Date().toISOString(),
          };
        });
        setPickMode(null);
        return;
      }

      if (selectedLineId && pickMode === "edit_to") {
        setLineEditDraft((prev) => {
          if (!prev) return prev;
          if (Math.abs(prev.fromLat - endpoint.latitude) < 1e-9 && Math.abs(prev.fromLng - endpoint.longitude) < 1e-9) {
            setEditorMsg("Titik awal dan titik akhir tidak boleh sama.");
            return prev;
          }
          return {
            ...prev,
            toName: endpoint.keypoint,
            toKategori: endpoint.kategori,
            toUlp: endpoint.ulp,
            toLat: endpoint.latitude,
            toLng: endpoint.longitude,
            pertemuan: `${prev.fromName} - ${endpoint.keypoint}`,
            updatedAt: new Date().toISOString(),
          };
        });
        setPickMode(null);
      }
    },
    [editMode, pickMode, selectedLineId, selectedUlp]
  );

  const handleNodeClick = useCallback(
    (group: NodeGroup) => {
      setSelectedPoint({ kind: "node", data: group });
      focusTo(group.latitude, group.longitude);

      if (editMode && (!selectedLineId || pickMode)) {
        handleNodePickedForEditor(group);
      }
    },
    [editMode, selectedLineId, pickMode, handleNodePickedForEditor, focusTo]
  );

  const handleToggleEditMode = () => {
    const next = !editMode;
    setEditMode(next);

    if (next) {
      setSelectedLineId(null);
      setLineEditDraft(null);
      setDraftLine(emptyDraftLine());
      setPickMode("draft_from");
      setEditorMsg("Mode edit aktif. Klik node untuk pilih titik awal.");
    } else {
      setSelectedLineId(null);
      setLineEditDraft(null);
      setDraftLine(null);
      setPickMode(null);
      setEditorMsg("");
    }
  };

  const saveDraftLine = async () => {
    if (!draftLine?.from || !draftLine?.to) {
      setEditorMsg("Pilih titik awal dan titik akhir dulu.");
      return;
    }

    if (sameEndpoint(draftLine.from, draftLine.to)) {
      setEditorMsg("Titik awal dan titik akhir tidak boleh sama.");
      return;
    }

    try {
      setLineBusy(true);

      const resp: JsonResponse<{ line: ManualLine }> = await jsonp(BUNDLE_URL, {
        mode: "line_create",
        forceInferUlp: "1",
        up3: UP3,
        ulp: "",
        pertemuan: buildLineName(draftLine.from, draftLine.to),
        kms: draftLine.kms || "",
        note: "",

        fromName: draftLine.from.keypoint,
        fromKategori: draftLine.from.kategori,
        fromUlp: draftLine.from.ulp || "",
        fromLat: String(draftLine.from.latitude),
        fromLng: String(draftLine.from.longitude),

        toName: draftLine.to.keypoint,
        toKategori: draftLine.to.kategori,
        toUlp: draftLine.to.ulp || "",
        toLat: String(draftLine.to.latitude),
        toLng: String(draftLine.to.longitude),
      });

      if (!resp?.success || !resp?.line) throw new Error(resp?.error || "gagal simpan data");

      await loadManualLines();

      if (resp.line.ulp && selectedUlp !== resp.line.ulp) {
        setSelectedUlp(resp.line.ulp);
      }

      setSelectedLineId(resp.line.id);
      setLineEditDraft(resp.line);
      setDraftLine(null);
      setPickMode(null);
      setEditorMsg(`Data berhasil disimpan. ULP otomatis: ${resp.line.ulp || "-"}`);
    } catch (e: any) {
      setEditorMsg("Gagal simpan data: " + String(e?.message || e));
    } finally {
      setLineBusy(false);
    }
  };

  const saveEditedLine = async () => {
    if (!lineEditDraft) return;

    try {
      setLineBusy(true);

      const resp: JsonResponse<{ line: ManualLine }> = await jsonp(BUNDLE_URL, {
        mode: "line_update",
        forceInferUlp: "1",
        id: lineEditDraft.id,
        up3: lineEditDraft.up3 || UP3,
        ulp: "",
        pertemuan: lineEditDraft.pertemuan || `${lineEditDraft.fromName} - ${lineEditDraft.toName}`,
        kms: lineEditDraft.kms || "",
        note: "",

        fromName: lineEditDraft.fromName,
        fromKategori: lineEditDraft.fromKategori,
        fromUlp: lineEditDraft.fromUlp || "",
        fromLat: String(lineEditDraft.fromLat),
        fromLng: String(lineEditDraft.fromLng),

        toName: lineEditDraft.toName,
        toKategori: lineEditDraft.toKategori,
        toUlp: lineEditDraft.toUlp || "",
        toLat: String(lineEditDraft.toLat),
        toLng: String(lineEditDraft.toLng),
      });

      if (!resp?.success || !resp?.line) throw new Error(resp?.error || "gagal update data");

      await loadManualLines();

      if (resp.line.ulp && selectedUlp !== resp.line.ulp) {
        setSelectedUlp(resp.line.ulp);
      }

      setLineEditDraft(resp.line);
      setEditorMsg(`Perubahan berhasil disimpan. ULP otomatis: ${resp.line.ulp || "-"}`);
    } catch (e: any) {
      setEditorMsg("Gagal update data: " + String(e?.message || e));
    } finally {
      setLineBusy(false);
    }
  };

  const deleteSelectedLine = async () => {
    if (!selectedLineId) return;
    if (!window.confirm("Hapus data ini?")) return;

    try {
      setLineBusy(true);
      const resp: JsonResponse = await jsonp(BUNDLE_URL, { mode: "line_delete", id: selectedLineId });
      if (!resp?.success) throw new Error(resp?.error || "gagal hapus data");

      await loadManualLines();
      setSelectedLineId(null);
      setLineEditDraft(null);
      setDraftLine(emptyDraftLine());
      setPickMode("draft_from");
      setEditorMsg("Data berhasil dihapus.");
    } catch (e: any) {
      setEditorMsg("Gagal hapus data: " + String(e?.message || e));
    } finally {
      setLineBusy(false);
    }
  };

  const polesUseCanvas = poleGroupsDisplayed.length > 1500;
  const nodesUseCanvas = nodeGroupsDisplayed.length > 1500;

  if (!mounted) return null;

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
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
            width: 310,
            boxShadow: "0px 2px 10px rgba(0,0,0,0.2)",
            fontSize: 12,
            maxHeight: "40vh",
            overflowY: "auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <b>Info</b>
            <button
              onClick={() => setSelectedPoint(null)}
              style={{ padding: "5px 8px", border: "1px solid #ddd", borderRadius: 8, background: "white", cursor: "pointer" }}
            >
              Clear
            </button>
          </div>

          {!selectedPoint ? (
            <div style={{ marginTop: 8, color: "#666" }}>Klik marker GH / LBS / REC / Tiang.</div>
          ) : selectedPoint.kind === "pole" ? (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontWeight: 800 }}>TIANG</div>
              <div style={{ color: "#666", marginTop: 2 }}>{fmtCoord(selectedPoint.data.latitude, selectedPoint.data.longitude)}</div>
              <div style={{ marginTop: 6 }}>
                ULP: <b>{selectedPoint.data.ulp || "-"}</b>
              </div>
              <div style={{ marginTop: 4 }}>
                Owner: <b>{selectedPoint.data.owners.join(", ") || "-"}</b>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontWeight: 800, color: colorByKategori(selectedPoint.data.kategori).stroke }}>
                {selectedPoint.data.kategori}
              </div>
              <div style={{ color: "#666", marginTop: 2 }}>{fmtCoord(selectedPoint.data.latitude, selectedPoint.data.longitude)}</div>
              <div style={{ marginTop: 6, fontWeight: 700 }}>{selectedPoint.data.items[0]?.keypoint || "-"}</div>
              <div style={{ marginTop: 4, color: "#444" }}>ULP: {selectedPoint.data.items[0]?.ulp || "-"}</div>
              <div style={{ color: "#444" }}>Status: {selectedPoint.data.items[0]?.status || "-"}</div>
            </div>
          )}
        </div>
      )}

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
            width: 360,
            boxShadow: "0px 2px 10px rgba(0,0,0,0.2)",
            fontSize: 12,
            maxHeight: "calc(100vh - 32px)",
            overflowY: "auto",
          }}
        >
          <b>Panel</b>

          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 800 }}>Mode Edit</div>
              <div style={{ marginTop: 4, color: "#666" }}>Klik node untuk pilih titik.</div>
            </div>
            <button
              onClick={handleToggleEditMode}
              style={{
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: 8,
                background: editMode ? "#e3f2fd" : "white",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              {editMode ? "ON" : "OFF"}
            </button>
          </div>

          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee" }}>
            <div style={{ fontWeight: 800 }}>Arah Jalur</div>
            <select
              value={routePreference}
              onChange={(e) => setRoutePreference(e.target.value as RoutePreference)}
              style={{ width: "100%", padding: 8, marginTop: 8 }}
            >
              <option value="auto">Auto</option>
              <option value="kanan">Kanan</option>
              <option value="kiri">Kiri</option>
              <option value="atas">Atas</option>
              <option value="bawah">Bawah</option>
            </select>
          </div>

          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee" }}>
            <div style={{ fontWeight: 800 }}>Search GH / LBS / REC</div>
            <input
              value={nodeSearch}
              onChange={(e) => setNodeSearch(e.target.value)}
              placeholder="cari keypoint / kategori / status / ulp"
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 8, marginTop: 8 }}
            />

            <div style={{ marginTop: 8, color: "#555" }}>
              Hasil: <b>{nodeGroupsFiltered.length}</b>
            </div>

            {nodeSearch.trim() ? (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6, maxHeight: 170, overflowY: "auto" }}>
                {nodeGroupsFiltered.slice(0, 12).map((n) => (
                  <button
                    key={n.key}
                    onClick={() => handleNodeClick(n)}
                    style={{
                      textAlign: "left",
                      padding: "8px 10px",
                      border: "1px solid #eee",
                      borderRadius: 8,
                      background: "white",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 700, color: colorByKategori(n.kategori).stroke }}>
                      {n.kategori} — {n.items[0]?.keypoint || "-"}
                    </div>
                    <div style={{ color: "#666", marginTop: 2 }}>{fmtCoord(n.latitude, n.longitude)}</div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee" }}>
            <div style={{ fontWeight: 800 }}>Pilih ULP untuk tampilkan tiang / filter garis</div>
            <button
              onClick={loadUlpList}
              style={{
                marginTop: 8,
                padding: "7px 10px",
                border: "1px solid #ddd",
                borderRadius: 8,
                background: "white",
                cursor: "pointer",
              }}
            >
              Reload ULP
            </button>
            {ulpLoading ? <span style={{ marginLeft: 8, color: "#777" }}>loading…</span> : null}

            <select
              value={selectedUlp}
              onChange={(e) => setSelectedUlp(e.target.value)}
              style={{ width: "100%", padding: 6, marginTop: 8 }}
            >
              <option value="">-- semua garis / tiang belum dipilih --</option>
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
          </div>

          <div style={{ marginTop: 10, color: "#444" }}>
            Zoom: <b>{currentZoom}</b> • viewportOnly: <b>{viewportOnly ? "ON" : "OFF"}</b>
            <br />
            Arah: <b>{routePreference.toUpperCase()}</b>
            <br />
            GH/LBS/REC: <b>{nodesLoading ? "loading..." : "ok"}</b>
            <br />
            Garis Tersimpan: <b>{linesLoading ? "loading..." : manualLines.length}</b>
            <br />
            Garis Tampil: <b>{manualLinesDisplayed.length}</b>
            <br />
            GH: <b>{stats.GH}</b> • LBS: <b>{stats.LBS}</b> • REC: <b>{stats.REC}</b>
            <br />
            Tiang: <b>{bundleLoading ? "loading..." : selectedUlp ? poleGroupsDisplayed.length : "belum dipilih"}</b>
            {errMsg ? <div style={{ color: "#d32f2f", marginTop: 6 }}>{errMsg}</div> : null}
          </div>

          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={viewportOnly} onChange={(e) => setViewportOnly(e.target.checked)} />
              <span>Render hanya yang terlihat (viewport)</span>
            </label>
          </div>

          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={ssMode} onChange={(e) => setSsMode(e.target.checked)} />
              <span>Screenshot mode</span>
            </label>
          </div>
        </div>
      )}

      {editMode && !ssMode && (
        <div
          style={{
            position: "absolute",
            zIndex: 1100,
            left: 16,
            bottom: 16,
            background: "white",
            padding: 12,
            borderRadius: 12,
            width: 410,
            boxShadow: "0px 6px 20px rgba(0,0,0,0.22)",
            fontSize: 12,
            maxHeight: "44vh",
            overflowY: "auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>Editor Garis</div>
            <div style={{ color: "#ef6c00", fontWeight: 700 }}>
              {pickMode === "draft_from" && "Pilih titik awal"}
              {pickMode === "draft_to" && "Pilih titik akhir"}
              {pickMode === "edit_from" && "Ganti titik awal"}
              {pickMode === "edit_to" && "Ganti titik akhir"}
              {!pickMode && (selectedLineId ? "Edit data" : "Tambah data")}
            </div>
          </div>

          {editorMsg ? (
            <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 8, background: "#f7f7f7" }}>
              {editorMsg}
            </div>
          ) : null}

          {!selectedLineId ? (
            <div style={{ marginTop: 10, border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
              <div style={{ fontWeight: 800 }}>Tambah Garis</div>

              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 700 }}>Nama</div>
                <div style={{ color: "#444", marginTop: 4 }}>
                  {buildLineName(draftLine?.from || null, draftLine?.to || null) || "-"}
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 700 }}>Titik Awal</div>
                <div style={{ color: draftLine?.from ? "#222" : "#999", marginTop: 4 }}>
                  {draftLine?.from ? `${draftLine.from.kategori} — ${draftLine.from.keypoint}` : "klik node"}
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 700 }}>Titik Akhir</div>
                <div style={{ color: draftLine?.to ? "#222" : "#999", marginTop: 4 }}>
                  {draftLine?.to ? `${draftLine.to.kategori} — ${draftLine.to.keypoint}` : "klik node"}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  onClick={() => {
                    setDraftLine(emptyDraftLine());
                    setPickMode("draft_from");
                    setEditorMsg("Klik node untuk pilih titik awal.");
                  }}
                  disabled={lineBusy}
                  style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, background: "white", cursor: "pointer" }}
                >
                  Reset Titik
                </button>
                <button
                  onClick={() => setPickMode("draft_from")}
                  disabled={lineBusy}
                  style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, background: "white", cursor: "pointer" }}
                >
                  Ulang Awal
                </button>
                <button
                  onClick={() => setPickMode("draft_to")}
                  disabled={lineBusy || !draftLine?.from}
                  style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, background: "white", cursor: "pointer" }}
                >
                  Ulang Akhir
                </button>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ marginBottom: 4 }}>Jarak (KMS)</div>
                <input
                  value={draftLine?.kms || ""}
                  onChange={(e) => setDraftLine((prev) => ({ ...(prev || emptyDraftLine()), kms: e.target.value }))}
                  placeholder="contoh: 1.25"
                  style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 8 }}
                />
              </div>

              <button
                onClick={saveDraftLine}
                disabled={lineBusy}
                style={{
                  marginTop: 10,
                  width: "100%",
                  padding: 9,
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  background: "#e3f2fd",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                {lineBusy ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          ) : lineEditDraft ? (
            <div style={{ marginTop: 10, border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
              <div style={{ fontWeight: 800 }}>Edit Data</div>

              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 700 }}>Nama</div>
                <div style={{ marginTop: 4 }}>{lineEditDraft.pertemuan || `${lineEditDraft.fromName} - ${lineEditDraft.toName}`}</div>
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 700 }}>ULP otomatis</div>
                <div style={{ marginTop: 4 }}>{lineEditDraft.ulp || "-"}</div>
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 700 }}>Titik Awal</div>
                <div style={{ marginTop: 4 }}>{lineEditDraft.fromKategori} — {lineEditDraft.fromName}</div>
                <button
                  onClick={() => setPickMode("edit_from")}
                  disabled={lineBusy}
                  style={{ marginTop: 6, padding: "7px 9px", border: "1px solid #ddd", borderRadius: 8, background: "white", cursor: "pointer" }}
                >
                  Ganti Titik Awal
                </button>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 700 }}>Titik Akhir</div>
                <div style={{ marginTop: 4 }}>{lineEditDraft.toKategori} — {lineEditDraft.toName}</div>
                <button
                  onClick={() => setPickMode("edit_to")}
                  disabled={lineBusy}
                  style={{ marginTop: 6, padding: "7px 9px", border: "1px solid #ddd", borderRadius: 8, background: "white", cursor: "pointer" }}
                >
                  Ganti Titik Akhir
                </button>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ marginBottom: 4 }}>Jarak (KMS)</div>
                <input
                  value={lineEditDraft.kms || ""}
                  onChange={(e) => setLineEditDraft((prev) => (prev ? { ...prev, kms: e.target.value } : prev))}
                  style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 8 }}
                />
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  onClick={saveEditedLine}
                  disabled={lineBusy}
                  style={{
                    flex: 1,
                    padding: 9,
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    background: "#e3f2fd",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  {lineBusy ? "Menyimpan..." : "Simpan"}
                </button>
                <button
                  onClick={deleteSelectedLine}
                  disabled={lineBusy}
                  style={{
                    flex: 1,
                    padding: 9,
                    border: "1px solid #f0c0c0",
                    borderRadius: 8,
                    background: "#fff5f5",
                    cursor: "pointer",
                    color: "#c62828",
                    fontWeight: 700,
                  }}
                >
                  {lineBusy ? "Proses..." : "Hapus"}
                </button>
              </div>

              <button
                onClick={() => {
                  setSelectedLineId(null);
                  setLineEditDraft(null);
                  setDraftLine(emptyDraftLine());
                  setPickMode("draft_from");
                }}
                disabled={lineBusy}
                style={{
                  marginTop: 8,
                  width: "100%",
                  padding: 9,
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  background: "white",
                  cursor: "pointer",
                }}
              >
                Kembali ke Tambah
              </button>
            </div>
          ) : null}

          <div style={{ marginTop: 12, fontWeight: 800 }}>
            Daftar Garis ({manualLinesFilteredByUlp.length})
          </div>

          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto" }}>
            {manualLinesFilteredByUlp.length === 0 ? (
              <div style={{ color: "#777" }}>Belum ada data tersimpan.</div>
            ) : (
              manualLinesFilteredByUlp.map((line) => (
                <button
                  key={line.id}
                  onClick={() => {
                    if (line.ulp && selectedUlp !== line.ulp) {
                      setSelectedUlp(line.ulp);
                    }
                    setSelectedLineId(line.id);
                    setDraftLine(null);
                    setPickMode(null);
                    setEditorMsg("Data dipilih untuk diedit.");
                    fitLine(line);
                  }}
                  style={{
                    textAlign: "left",
                    padding: "8px 10px",
                    border: selectedLineId === line.id ? "1px solid #64b5f6" : "1px solid #eee",
                    borderRadius: 8,
                    background: selectedLineId === line.id ? "#f3f9ff" : "white",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{line.pertemuan || `${line.fromName} - ${line.toName}`}</div>
                  <div style={{ color: "#666", marginTop: 2 }}>
                    ULP: {line.ulp || "-"} • Jarak: {line.kms || "-"} KMS
                  </div>
                </button>
              ))
            )}
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

        {draftLinePath && (
          <Polyline
            positions={draftLinePath as any}
            pathOptions={{
              color: COLOR_DRAFT_LINE,
              weight: 4,
              opacity: 0.95,
              dashArray: "8 8",
            }}
          />
        )}

        {manualLinesDisplayed.map((l) => {
          const isSelected = selectedLineId === l.id;
          return (
            <Polyline
              key={l.id}
              positions={
                (manualLinePathMap.get(l.id) || [
                  [l.fromLat, l.fromLng],
                  [l.toLat, l.toLng],
                ]) as any
              }
              pathOptions={{
                color: isSelected ? COLOR_SELECTED_LINE : COLOR_MANUAL_LINE,
                weight: isSelected ? 5 : 3,
                opacity: 0.92,
              }}
              eventHandlers={{
                click: () => {
                  if (l.ulp && selectedUlp !== l.ulp) {
                    setSelectedUlp(l.ulp);
                  }
                  setSelectedLineId(l.id);
                  setDraftLine(null);
                  setPickMode(null);
                  setEditorMsg("Garis dipilih.");
                },
              }}
            >
              {!ssMode && (
                <Tooltip sticky direction="top" opacity={1}>
                  <div style={{ fontSize: 12, minWidth: 200 }}>
                    <div style={{ fontWeight: 700 }}>{l.pertemuan || `${l.fromName} - ${l.toName}`}</div>
                    <div style={{ color: "#666", marginTop: 4 }}>ULP: {l.ulp || "-"}</div>
                    <div style={{ color: "#666" }}>Jarak: {l.kms || "-"} KMS</div>
                    <div style={{ color: "#666" }}>Tiang cocok: {l.matchedPoleCount || 0}</div>
                  </div>
                </Tooltip>
              )}
            </Polyline>
          );
        })}

        {nodesUseCanvas
          ? nodeGroupsDisplayed.map((n) => {
              const color = colorByKategori(n.kategori);
              return (
                <CircleMarker
                  key={`nC-${n.key}`}
                  center={[n.latitude, n.longitude]}
                  radius={nodeCanvasRadius}
                  pathOptions={{
                    color: color.stroke,
                    weight: 1.35,
                    fillColor: color.fill,
                    fillOpacity: 0.95,
                  }}
                  eventHandlers={{ click: () => handleNodeClick(n) }}
                />
              );
            })
          : nodeGroupsDisplayed.map((n) => (
              <Marker key={n.key} position={[n.latitude, n.longitude]} icon={iconByKategori(n.kategori)} eventHandlers={{ click: () => handleNodeClick(n) }}>
                {!ssMode && (
                  <Tooltip sticky direction="top" opacity={1}>
                    <div style={{ fontSize: 12 }}>
                      <div style={{ fontWeight: 700 }}>{n.kategori}</div>
                      <div style={{ color: "#666", marginTop: 4 }}>{fmtCoord(n.latitude, n.longitude)}</div>
                      <div style={{ marginTop: 4 }}>{n.items[0]?.keypoint || "-"}</div>
                    </div>
                  </Tooltip>
                )}
              </Marker>
            ))}

        {!!selectedUlp &&
          (polesUseCanvas
            ? poleGroupsDisplayed.map((g) => (
                <CircleMarker
                  key={`pC-${g.key}`}
                  center={[g.latitude, g.longitude]}
                  radius={poleCanvasRadius}
                  pathOptions={{
                    color: COLOR_TIANG.stroke,
                    weight: 1.35,
                    fillColor: COLOR_TIANG.fill,
                    fillOpacity: 0.9,
                  }}
                  eventHandlers={{
                    click: () => {
                      setSelectedPoint({ kind: "pole", data: g });
                      focusTo(g.latitude, g.longitude);
                    },
                  }}
                />
              ))
            : poleGroupsDisplayed.map((g) => (
                <Marker
                  key={g.key}
                  position={[g.latitude, g.longitude]}
                  icon={iconTiang}
                  eventHandlers={{
                    click: () => {
                      setSelectedPoint({ kind: "pole", data: g });
                      focusTo(g.latitude, g.longitude);
                    },
                  }}
                >
                  {!ssMode && (
                    <Tooltip sticky direction="top" opacity={1}>
                      <div style={{ fontSize: 12 }}>
                        <div style={{ fontWeight: 700 }}>TIANG</div>
                        <div style={{ color: "#666", marginTop: 4 }}>{fmtCoord(g.latitude, g.longitude)}</div>
                        <div style={{ marginTop: 4 }}>
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