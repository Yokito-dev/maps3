"use client";

import dynamic from "next/dynamic";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { divIcon, type DivIcon, type Map as LeafletMap } from "leaflet";
import { useMap, useMapEvents } from "react-leaflet";

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

const PENYULANG_OPTIONS = [
  "PENYULANG A",
  "PENYULANG B",
  "PENYULANG C",
];

type NodeKategori = "GH" | "LBS" | "REC";
type RoutePointKind = "pole" | "vertex";

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

type PoleAggregateCell = {
  key: string;
  latitude: number;
  longitude: number;
  count: number;
  ulps: string[];
  hasSectionPole: boolean;
  hasSelectedRoutePole: boolean;
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

type RoutePathPoint = {
  key: string;
  latitude: number;
  longitude: number;
  kind: RoutePointKind;
};

type RouteBranch = {
  id: string;
  name: string;
  points: RoutePathPoint[];
};

type ManualLine = {
  id: string;
  rowId: number;
  up3: string;
  ulp: string;
  penyulang: string;
  pertemuan: string;
  kms: string;
  matchedPoleCount?: number;
  inferDistanceMeters?: number;
  note?: string;

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
  penyulang: string;
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

type ParsedLineNote = {
  mainRoutePoints: RoutePathPoint[];
  branches: RouteBranch[];
};

type RenderedBranchPath = {
  id: string;
  name: string;
  positions: number[][];
};

type RenderedLinePaths = {
  main: number[][];
  branches: RenderedBranchPath[];
};

const COLOR_TIANG_BASE = { stroke: "#082f6b", fill: "#0b3f93" };
const COLOR_TIANG_SECTION = { stroke: "#1565c0", fill: "#4f8fe8" };
const COLOR_TIANG_SELECTED = { stroke: "#ef6c00", fill: "#ffb74d" };
const COLOR_VERTEX = { stroke: "#7b1fa2", fill: "#ba68c8" };

const COLOR_GH = { stroke: "#1565c0", fill: "#42a5f5" };
const COLOR_LBS = { stroke: "#111111", fill: "#ef5350" };
const COLOR_REC = { stroke: "#1b5e20", fill: "#43a047" };

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
  __jsonpMutex = p.catch(() => { });
  return p;
}

function MapSetter({ onReady }: { onReady: (m: LeafletMap) => void }) {
  const map = useMap();
  useEffect(() => onReady(map), [map, onReady]);
  return null;
}

function MapClickCapture({
  enabled,
  onClickMap,
}: {
  enabled: boolean;
  onClickMap: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (!enabled) return;
      onClickMap(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function coordKey(lat: number, lng: number) {
  return `${lat.toFixed(DEDUP_DECIMALS)},${lng.toFixed(DEDUP_DECIMALS)}`;
}

function fmtCoord(lat: number, lng: number) {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
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

function makeGhIcon(size = 30): DivIcon {
  const html = `
  <div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:transparent;border:none;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.35));">
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
      <path d="M2.5 12 H7.5" stroke="#1565c0" stroke-width="2" stroke-linecap="round"/>
      <rect x="7.5" y="8.3" width="9" height="7.4" rx="0.8" fill="white" stroke="#1565c0" stroke-width="1.9"/>
      <path d="M16.5 12 H21.5" stroke="#1565c0" stroke-width="2" stroke-linecap="round"/>
      <path d="M12 15.7 V20.3" stroke="#1565c0" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="12" cy="20.3" r="1.3" fill="#1565c0"/>
      <path d="M10 10.7 H14" stroke="#1565c0" stroke-width="1.35" stroke-linecap="round"/>
      <path d="M10 13.3 H14" stroke="#1565c0" stroke-width="1.35" stroke-linecap="round"/>
    </svg>
  </div>`;
  return divIcon({
    className: "w9-div-icon",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size * 0.72],
    tooltipAnchor: [0, -size * 0.65],
  });
}

function makeLbsIcon(size = 28): DivIcon {
  const html = `
  <div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:transparent;border:none;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.35));">
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" fill="white" stroke="#111111" stroke-width="2"/>
      <circle cx="12" cy="12" r="3.2" fill="#ef5350" stroke="#111111" stroke-width="1"/>
      <path d="M3.5 12 H6" stroke="#111111" stroke-width="2" stroke-linecap="round"/>
      <path d="M18 12 H20.5" stroke="#111111" stroke-width="2" stroke-linecap="round"/>
    </svg>
  </div>`;
  return divIcon({
    className: "w9-div-icon",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size * 0.72],
    tooltipAnchor: [0, -size * 0.65],
  });
}

function makeRecIcon(size = 28): DivIcon {
  const html = `
  <div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:transparent;border:none;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.35));">
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
      <path d="M8 4 V20" stroke="#2e7d32" stroke-width="2.3" stroke-linecap="round"/>
      <path d="M12 4 V20" stroke="#43a047" stroke-width="2.3" stroke-linecap="round"/>
      <path d="M16 4 V20" stroke="#66bb6a" stroke-width="2.3" stroke-linecap="round"/>
    </svg>
  </div>`;
  return divIcon({
    className: "w9-div-icon",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size * 0.72],
    tooltipAnchor: [0, -size * 0.65],
  });
}

function emptyDraftLine(): DraftLine {
  return {
    kms: "",
    penyulang: "",
    from: null,
    to: null,
  };
}

function makeBranchId() {
  return `branch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function makeVertexId() {
  return `vertex_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function nextBranchName(branches: RouteBranch[]) {
  const used = new Set(branches.map((b) => String(b.name || "").trim().toUpperCase()));
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  for (const ch of letters) {
    const candidate = `SECTION ${ch}`;
    if (!used.has(candidate)) return candidate;
  }

  return `SECTION ${branches.length + 1}`;
}

function makeVertexPoint(lat: number, lng: number): RoutePathPoint {
  return {
    key: makeVertexId(),
    latitude: lat,
    longitude: lng,
    kind: "vertex",
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

function buildAdjacencyFromNeighborMap(
  neighborMap: PoleNeighbor[][],
  thresholdMeters: number
) {
  const adj: Array<Array<{ to: number; w: number }>> = Array.from(
    { length: neighborMap.length },
    () => []
  );

  for (let i = 0; i < neighborMap.length; i++) {
    for (const n of neighborMap[i]) {
      if (n.dist <= thresholdMeters) {
        adj[i].push({ to: n.idx, w: n.dist });
        adj[n.idx].push({ to: i, w: n.dist });
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
  neighborMap: PoleNeighbor[][]
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
    const adj = buildAdjacencyFromNeighborMap(neighborMap, th);
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

function buildManualRoutePolylinePositions(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  routePoints: RoutePathPoint[]
) {
  const pts: number[][] = [[fromLat, fromLng]];
  routePoints.forEach((p) => pts.push([p.latitude, p.longitude]));
  pts.push([toLat, toLng]);
  return dedupeLatLng(pts);
}

function parseRoutePoints(arr: any[]): RoutePathPoint[] {
  return arr
    .map((x: any) => ({
      key: String(x?.key || coordKey(Number(x?.latitude), Number(x?.longitude))),
      latitude: Number(x?.latitude),
      longitude: Number(x?.longitude),
      kind: x?.kind === "vertex" ? "vertex" : "pole",
    }))
    .filter(
      (x: RoutePathPoint) =>
        Number.isFinite(x.latitude) && Number.isFinite(x.longitude)
    );
}

function parseLineNote(note?: string): ParsedLineNote {
  if (!note) return { mainRoutePoints: [], branches: [] };

  try {
    const obj = JSON.parse(String(note));

    const mainArr = Array.isArray(obj?.mainRoutePoints)
      ? obj.mainRoutePoints
      : Array.isArray(obj?.mainPoleRoute)
        ? obj.mainPoleRoute
        : Array.isArray(obj?.poleRoute)
          ? obj.poleRoute
          : [];

    const branchesRaw = Array.isArray(obj?.branches) ? obj.branches : [];

    const mainRoutePoints = parseRoutePoints(mainArr);

    const branches: RouteBranch[] = branchesRaw
      .map((x: any, idx: number) => ({
        id: String(x?.id || makeBranchId()),
        name: String(x?.name || `SECTION ${idx + 1}`).trim() || `SECTION ${idx + 1}`,
        points: parseRoutePoints(Array.isArray(x?.points) ? x.points : Array.isArray(x?.poles) ? x.poles : []),
      }))
      .filter((x: RouteBranch) => x.points.length > 0 || x.name);

    return { mainRoutePoints, branches };
  } catch {
    return { mainRoutePoints: [], branches: [] };
  }
}

function serializeLineNote(mainRoutePoints: RoutePathPoint[], branches: RouteBranch[]) {
  const cleanedBranches = branches
    .map((b) => ({
      id: b.id,
      name: b.name,
      points: b.points.map((p) => ({
        key: p.key,
        latitude: p.latitude,
        longitude: p.longitude,
        kind: p.kind,
      })),
    }))
    .filter((b) => b.points.length > 0);

  if (!mainRoutePoints.length && !cleanedBranches.length) return "";

  return JSON.stringify({
    mainRoutePoints: mainRoutePoints.map((p) => ({
      key: p.key,
      latitude: p.latitude,
      longitude: p.longitude,
      kind: p.kind,
    })),
    branches: cleanedBranches,
  });
}

function getMainRoutePointsFromLine(line: ManualLine | null | undefined) {
  return parseLineNote(line?.note).mainRoutePoints;
}

function getBranchesFromLine(line: ManualLine | null | undefined) {
  return parseLineNote(line?.note).branches;
}

function nearestPointOnPath(path: number[][], lat: number, lng: number) {
  if (!path.length) return [lat, lng];

  let best = path[0];
  let bestDist = Number.POSITIVE_INFINITY;

  for (const p of path) {
    const d = haversineMeters(lat, lng, p[0], p[1]);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }

  return best;
}

function buildBranchPolylinePositions(
  routePoints: RoutePathPoint[],
  anchorPath: number[][]
) {
  if (!routePoints.length) return [];

  const raw = routePoints.map((p) => [p.latitude, p.longitude]);
  const anchor = anchorPath.length
    ? nearestPointOnPath(anchorPath, routePoints[0].latitude, routePoints[0].longitude)
    : raw[0];

  return dedupeLatLng([[anchor[0], anchor[1]], ...raw]);
}

function countRoutePoints(points: RoutePathPoint[]) {
  return points.length;
}

function countAllRoutePoints(mainPoints: RoutePathPoint[], branches: RouteBranch[]) {
  return mainPoints.length + branches.reduce((acc, b) => acc + b.points.length, 0);
}

function pointToSegmentDistanceMeters(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
) {
  const refLat = (pLat + aLat + bLat) / 3;
  const cosLat = Math.cos((refLat * Math.PI) / 180);
  const mx = (lng: number) => lng * 111320 * cosLat;
  const my = (lat: number) => lat * 110540;

  const px = mx(pLng);
  const py = my(pLat);
  const ax = mx(aLng);
  const ay = my(aLat);
  const bx = mx(bLng);
  const by = my(bLat);

  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;

  const ab2 = abx * abx + aby * aby;
  if (ab2 <= 1e-9) {
    const dx = px - ax;
    const dy = py - ay;
    return Math.sqrt(dx * dx + dy * dy);
  }

  let t = (apx * abx + apy * aby) / ab2;
  t = Math.max(0, Math.min(1, t));

  const qx = ax + t * abx;
  const qy = ay + t * aby;

  const dx = px - qx;
  const dy = py - qy;
  return Math.sqrt(dx * dx + dy * dy);
}

function pointToPolylineDistanceMeters(
  pLat: number,
  pLng: number,
  path: number[][]
) {
  if (!path.length) return Number.POSITIVE_INFINITY;
  if (path.length === 1) return haversineMeters(pLat, pLng, path[0][0], path[0][1]);

  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < path.length - 1; i++) {
    const d = pointToSegmentDistanceMeters(
      pLat,
      pLng,
      path[i][0],
      path[i][1],
      path[i + 1][0],
      path[i + 1][1]
    );
    if (d < best) best = d;
  }
  return best;
}

function filterPolesBySectionPath(
  poles: PoleGroup[],
  path: number[][]
) {
  if (!poles.length) return [];
  if (!path.length) return poles;

  const scored = poles
    .map((pole) => ({
      pole,
      dist: pointToPolylineDistanceMeters(pole.latitude, pole.longitude, path),
    }))
    .sort((a, b) => a.dist - b.dist);

  let chosen = scored.filter((x) => x.dist <= 25);
  if (chosen.length < 4) chosen = scored.filter((x) => x.dist <= 40);
  if (chosen.length < 4) chosen = scored.filter((x) => x.dist <= 65);
  if (chosen.length < 4) chosen = scored.filter((x) => x.dist <= 90);
  if (chosen.length < 4) chosen = scored.slice(0, Math.min(150, scored.length));

  return chosen.map((x) => x.pole);
}

function filterPolesForRouting(
  poles: PoleGroup[],
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
) {
  if (!poles.length) return [];

  const minLat = Math.min(fromLat, toLat);
  const maxLat = Math.max(fromLat, toLat);
  const minLng = Math.min(fromLng, toLng);
  const maxLng = Math.max(fromLng, toLng);

  const pass1 = poles.filter((p) => {
    const inBox =
      p.latitude >= minLat - 0.0035 &&
      p.latitude <= maxLat + 0.0035 &&
      p.longitude >= minLng - 0.0035 &&
      p.longitude <= maxLng + 0.0035;

    if (!inBox) return false;

    return pointToSegmentDistanceMeters(
      p.latitude,
      p.longitude,
      fromLat,
      fromLng,
      toLat,
      toLng
    ) <= 250;
  });

  if (pass1.length >= 15) return pass1;

  const pass2 = poles.filter((p) => {
    const nearLine =
      pointToSegmentDistanceMeters(
        p.latitude,
        p.longitude,
        fromLat,
        fromLng,
        toLat,
        toLng
      ) <= 400;

    const nearStart = haversineMeters(p.latitude, p.longitude, fromLat, fromLng) <= 150;
    const nearEnd = haversineMeters(p.latitude, p.longitude, toLat, toLng) <= 150;

    return nearLine || nearStart || nearEnd;
  });

  if (pass2.length >= 10) return pass2;

  const pass3 = poles.filter((p) => {
    return (
      pointToSegmentDistanceMeters(
        p.latitude,
        p.longitude,
        fromLat,
        fromLng,
        toLat,
        toLng
      ) <= 650
    );
  });

  if (pass3.length >= 6) return pass3;

  return poles;
}

function getPoleGridSizeDegrees(zoom: number, poleCount: number) {
  if (poleCount > 5000) return 0.003;
  if (poleCount > 3000) return 0.0022;
  if (poleCount > 1800) return 0.0016;

  if (zoom <= 10) return 0.02;
  if (zoom <= 11) return 0.012;
  if (zoom <= 12) return 0.007;
  if (zoom <= 13) return 0.004;
  if (zoom <= 14) return 0.0024;

  return 0;
}

function aggregatePoleGroups(
  poles: PoleGroup[],
  cellSizeDeg: number,
  selectedSet: Set<string>,
  sectionSet: Set<string>
): PoleAggregateCell[] {
  if (!poles.length || cellSizeDeg <= 0) return [];

  const m = new Map<
    string,
    {
      sumLat: number;
      sumLng: number;
      count: number;
      ulps: Set<string>;
      hasSectionPole: boolean;
      hasSelectedRoutePole: boolean;
    }
  >();

  for (const p of poles) {
    const gx = Math.floor(p.latitude / cellSizeDeg);
    const gy = Math.floor(p.longitude / cellSizeDeg);
    const key = `${gx}|${gy}`;

    if (!m.has(key)) {
      m.set(key, {
        sumLat: 0,
        sumLng: 0,
        count: 0,
        ulps: new Set<string>(),
        hasSectionPole: false,
        hasSelectedRoutePole: false,
      });
    }

    const cell = m.get(key)!;
    cell.sumLat += p.latitude;
    cell.sumLng += p.longitude;
    cell.count += 1;
    if (p.ulp) cell.ulps.add(p.ulp);
    if (sectionSet.has(p.key)) cell.hasSectionPole = true;
    if (selectedSet.has(p.key)) cell.hasSelectedRoutePole = true;
  }

  return Array.from(m.entries())
    .map(([key, cell]) => ({
      key,
      latitude: cell.sumLat / cell.count,
      longitude: cell.sumLng / cell.count,
      count: cell.count,
      ulps: Array.from(cell.ulps),
      hasSectionPole: cell.hasSectionPole,
      hasSelectedRoutePole: cell.hasSelectedRoutePole,
    }))
    .sort((a, b) => b.count - a.count);
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

  const [draftPoleRoute, setDraftPoleRoute] = useState<RoutePathPoint[]>([]);
  const [lineEditPoleRoute, setLineEditPoleRoute] = useState<RoutePathPoint[]>([]);

  const [draftBranches, setDraftBranches] = useState<RouteBranch[]>([]);
  const [lineEditBranches, setLineEditBranches] = useState<RouteBranch[]>([]);

  const [activeRouteKey, setActiveRouteKey] = useState<string>("main");
  const [activeInputMode, setActiveInputMode] = useState<"pole" | "vertex">("pole");

  const boundsRef = useRef<any>(null);
  const [boundsVersion, setBoundsVersion] = useState(0);

  const iconGH = useMemo(() => makeGhIcon(30), []);
  const iconLBS = useMemo(() => makeLbsIcon(28), []);
  const iconREC = useMemo(() => makeRecIcon(28), []);

  const poleCanvasRadius = useMemo(() => {
    const r = 1.65 + (currentZoom - 10) * 0.26;
    return Math.max(1.5, Math.min(4.1, r));
  }, [currentZoom]);

  const nodeCanvasRadius = useMemo(() => {
    const r = 2 + (currentZoom - 10) * 0.16;
    return Math.max(1.8, Math.min(3.4, r));
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
      const resp: JsonResponse<{ ulps: string[] }> = await jsonp(BUNDLE_URL, { mode: "ulplist", up3: UP3 });
      if (!resp?.success || !Array.isArray(resp.ulps)) throw new Error(resp?.error || "ulplist gagal");
      setUlpList(resp.ulps);
    } catch (e: any) {
      setErrMsg("Gagal load daftar ULP: " + String(e?.message || e));
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
        setErrMsg("");

        const resp: JsonResponse<{ poles: PolePointRaw[] }> = await jsonp(
          BUNDLE_URL,
          { mode: "bundle", ulp: selectedUlp, up3: UP3 },
          90000
        );

        if (!resp?.success || !Array.isArray(resp.poles)) throw new Error(resp?.error || "bundle gagal");
        if (!cancelled) setPolesRaw(resp.poles);
      } catch (e: any) {
        if (!cancelled) {
          setErrMsg("Gagal load tiang ULP: " + String(e?.message || e));
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
      setLineEditPoleRoute([]);
      setLineEditBranches([]);
      setActiveRouteKey("main");
      return;
    }

    const found = manualLines.find((x) => x.id === selectedLineId) || null;
    setLineEditDraft(found ? { ...found } : null);
    setLineEditPoleRoute(getMainRoutePointsFromLine(found));
    setLineEditBranches(getBranchesFromLine(found));
    setActiveRouteKey("main");

    const inferredUlp = found?.ulp || found?.fromUlp || found?.toUlp || "";
    if (found && inferredUlp && inferredUlp !== selectedUlp) {
      setSelectedUlp(inferredUlp);
    }
  }, [selectedLineId, manualLines, selectedUlp]);

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
          ulp: p.ulp || selectedUlp || "",
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

  const nodeGroupsDisplayed = useMemo(() => {
    let list = nodeGroupsFiltered;
    const b = viewportOnly ? boundsRef.current : null;
    if (b) list = list.filter((n) => b.contains([n.latitude, n.longitude] as any));
    return list;
  }, [nodeGroupsFiltered, viewportOnly, boundsVersion]);

  const poleGroupsDisplayed = useMemo(() => {
    let list = poleGroups;
    const b = viewportOnly ? boundsRef.current : null;
    if (b) list = list.filter((p) => b.contains([p.latitude, p.longitude] as any));
    return list;
  }, [poleGroups, viewportOnly, boundsVersion]);

  const manualLinesDisplayed = useMemo(() => {
    return manualLines;
  }, [manualLines]);

  const activeLineEndpoints = useMemo(() => {
    if (selectedLineId && lineEditDraft) {
      return {
        fromLat: lineEditDraft.fromLat,
        fromLng: lineEditDraft.fromLng,
        toLat: lineEditDraft.toLat,
        toLng: lineEditDraft.toLng,
      };
    }

    if (!selectedLineId && draftLine?.from && draftLine?.to) {
      return {
        fromLat: draftLine.from.latitude,
        fromLng: draftLine.from.longitude,
        toLat: draftLine.to.latitude,
        toLng: draftLine.to.longitude,
      };
    }

    return null;
  }, [selectedLineId, lineEditDraft, draftLine]);

  const currentBranches = useMemo(
    () => (selectedLineId ? lineEditBranches : draftBranches),
    [selectedLineId, lineEditBranches, draftBranches]
  );

  useEffect(() => {
    if (activeRouteKey === "main") return;
    if (!currentBranches.some((b) => b.id === activeRouteKey)) {
      setActiveRouteKey("main");
    }
  }, [activeRouteKey, currentBranches]);

  const activeRouteLabel = useMemo(() => {
    if (activeRouteKey === "main") return "MAIN";
    return currentBranches.find((b) => b.id === activeRouteKey)?.name || "SECTION";
  }, [activeRouteKey, currentBranches]);

  const activeEditableRoutePoints = useMemo(() => {
    if (activeRouteKey === "main") {
      return selectedLineId ? lineEditPoleRoute : draftPoleRoute;
    }
    return currentBranches.find((b) => b.id === activeRouteKey)?.points || [];
  }, [activeRouteKey, selectedLineId, lineEditPoleRoute, draftPoleRoute, currentBranches]);

  const allActivePolePoints = useMemo(() => {
    const main = (selectedLineId ? lineEditPoleRoute : draftPoleRoute).filter((p) => p.kind === "pole");
    const branches = currentBranches.flatMap((b) => b.points.filter((p) => p.kind === "pole"));
    return [...main, ...branches];
  }, [selectedLineId, lineEditPoleRoute, draftPoleRoute, currentBranches]);

  const activePoleRouteKeySet = useMemo(
    () => new Set(allActivePolePoints.map((x) => x.key)),
    [allActivePolePoints]
  );

  const activePoleRouteIndexMap = useMemo(() => {
    const m = new Map<string, number>();
    activeEditableRoutePoints
      .filter((p) => p.kind === "pole")
      .forEach((p, i) => m.set(p.key, i + 1));
    return m;
  }, [activeEditableRoutePoints]);

  const routingPoleGroups = useMemo(() => {
    if (!activeLineEndpoints) return [];
    return filterPolesForRouting(
      poleGroups,
      activeLineEndpoints.fromLat,
      activeLineEndpoints.fromLng,
      activeLineEndpoints.toLat,
      activeLineEndpoints.toLng
    );
  }, [poleGroups, activeLineEndpoints]);

  const routingPoleNeighborMap = useMemo<PoleNeighbor[][]>(() => {
    if (!routingPoleGroups.length) return [];

    const out: PoleNeighbor[][] = Array.from({ length: routingPoleGroups.length }, () => []);

    for (let i = 0; i < routingPoleGroups.length; i++) {
      const arr: PoleNeighbor[] = [];

      for (let j = 0; j < routingPoleGroups.length; j++) {
        if (i === j) continue;

        const d = haversineMeters(
          routingPoleGroups[i].latitude,
          routingPoleGroups[i].longitude,
          routingPoleGroups[j].latitude,
          routingPoleGroups[j].longitude
        );

        arr.push({ idx: j, dist: d });
      }

      arr.sort((a, b) => a.dist - b.dist);
      out[i] = arr.slice(0, 8);
    }

    return out;
  }, [routingPoleGroups]);

  const activeAutoSectionPath = useMemo(() => {
    if (!activeLineEndpoints) return null;

    return buildPolePolylinePositions(
      activeLineEndpoints.fromLat,
      activeLineEndpoints.fromLng,
      activeLineEndpoints.toLat,
      activeLineEndpoints.toLng,
      routingPoleGroups,
      routingPoleNeighborMap
    );
  }, [activeLineEndpoints, routingPoleGroups, routingPoleNeighborMap]);

  const draftLinePath = useMemo(() => {
    if (selectedLineId) return null;
    if (!draftLine?.from || !draftLine?.to) return null;

    if (draftPoleRoute.length) {
      return buildManualRoutePolylinePositions(
        draftLine.from.latitude,
        draftLine.from.longitude,
        draftLine.to.latitude,
        draftLine.to.longitude,
        draftPoleRoute
      );
    }

    return buildPolePolylinePositions(
      draftLine.from.latitude,
      draftLine.from.longitude,
      draftLine.to.latitude,
      draftLine.to.longitude,
      routingPoleGroups,
      routingPoleNeighborMap
    );
  }, [selectedLineId, draftLine, draftPoleRoute, routingPoleGroups, routingPoleNeighborMap]);

  const activeMainBasePath = useMemo(() => {
    if (selectedLineId && lineEditDraft) {
      if (lineEditPoleRoute.length) {
        return buildManualRoutePolylinePositions(
          lineEditDraft.fromLat,
          lineEditDraft.fromLng,
          lineEditDraft.toLat,
          lineEditDraft.toLng,
          lineEditPoleRoute
        );
      }

      return (
        activeAutoSectionPath || [
          [lineEditDraft.fromLat, lineEditDraft.fromLng],
          [lineEditDraft.toLat, lineEditDraft.toLng],
        ]
      );
    }

    if (!selectedLineId && draftLine?.from && draftLine?.to) {
      return (
        draftLinePath || [
          [draftLine.from.latitude, draftLine.from.longitude],
          [draftLine.to.latitude, draftLine.to.longitude],
        ]
      );
    }

    return [];
  }, [selectedLineId, lineEditDraft, lineEditPoleRoute, activeAutoSectionPath, draftLine, draftLinePath]);

  const activeCurrentRoutePath = useMemo(() => {
    if (!activeLineEndpoints) return [];

    if (activeRouteKey === "main") {
      return activeMainBasePath;
    }

    return buildBranchPolylinePositions(activeEditableRoutePoints, activeMainBasePath);
  }, [activeLineEndpoints, activeRouteKey, activeEditableRoutePoints, activeMainBasePath]);

  const sectionPoleCandidatesAll = useMemo(() => {
    if (!poleGroups.length) return [];
    if (!activeCurrentRoutePath.length) return [];
    return filterPolesBySectionPath(poleGroups, activeCurrentRoutePath);
  }, [poleGroups, activeCurrentRoutePath]);

  const sectionPoleKeySet = useMemo(
    () => new Set(sectionPoleCandidatesAll.map((p) => p.key)),
    [sectionPoleCandidatesAll]
  );

  const draftBranchPathList = useMemo<RenderedBranchPath[]>(() => {
    if (selectedLineId) return [];

    return draftBranches
      .map((b) => ({
        id: b.id,
        name: b.name,
        positions: buildBranchPolylinePositions(b.points, activeMainBasePath),
      }))
      .filter((b) => b.positions.length >= 2);
  }, [selectedLineId, draftBranches, activeMainBasePath]);

  const manualLinePathMap = useMemo(() => {
    const m = new Map<string, RenderedLinePaths>();

    for (const l of manualLinesDisplayed) {
      const mainRoutePoints =
        selectedLineId === l.id && lineEditDraft
          ? lineEditPoleRoute
          : getMainRoutePointsFromLine(l);

      const branchPoints =
        selectedLineId === l.id && lineEditDraft
          ? lineEditBranches
          : getBranchesFromLine(l);

      let mainPositions: number[][];

      if (mainRoutePoints.length) {
        mainPositions = buildManualRoutePolylinePositions(
          l.fromLat,
          l.fromLng,
          l.toLat,
          l.toLng,
          mainRoutePoints
        );
      } else if (selectedLineId === l.id && activeLineEndpoints) {
        mainPositions = buildPolePolylinePositions(
          l.fromLat,
          l.fromLng,
          l.toLat,
          l.toLng,
          routingPoleGroups,
          routingPoleNeighborMap
        );
      } else {
        mainPositions = [
          [l.fromLat, l.fromLng],
          [l.toLat, l.toLng],
        ];
      }

      const branchPaths: RenderedBranchPath[] = branchPoints
        .map((b) => ({
          id: b.id,
          name: b.name,
          positions: buildBranchPolylinePositions(b.points, mainPositions),
        }))
        .filter((b) => b.positions.length >= 2);

      m.set(l.id, {
        main: mainPositions,
        branches: branchPaths,
      });
    }

    return m;
  }, [
    manualLinesDisplayed,
    selectedLineId,
    lineEditDraft,
    lineEditPoleRoute,
    lineEditBranches,
    activeLineEndpoints,
    routingPoleGroups,
    routingPoleNeighborMap,
  ]);

  const isChoosingPoles = useMemo(
    () => editMode && !pickMode && !!activeLineEndpoints,
    [editMode, pickMode, activeLineEndpoints]
  );

  const poleGridSizeDeg = useMemo(
    () => getPoleGridSizeDegrees(currentZoom, poleGroupsDisplayed.length),
    [currentZoom, poleGroupsDisplayed.length]
  );

  const shouldAggregatePoles = useMemo(() => {
    if (isChoosingPoles) return false;
    if (poleGroupsDisplayed.length <= 700) return false;
    return poleGridSizeDeg > 0;
  }, [isChoosingPoles, poleGroupsDisplayed.length, poleGridSizeDeg]);

  const poleAggregateCells = useMemo(() => {
    if (!shouldAggregatePoles) return [];
    return aggregatePoleGroups(
      poleGroupsDisplayed,
      poleGridSizeDeg,
      activePoleRouteKeySet,
      sectionPoleKeySet
    );
  }, [shouldAggregatePoles, poleGroupsDisplayed, poleGridSizeDeg, activePoleRouteKeySet, sectionPoleKeySet]);

  const stats = useMemo(() => {
    const out = { GH: 0, LBS: 0, REC: 0 };
    nodesRaw.forEach((n) => {
      if (n.kategori === "GH") out.GH++;
      if (n.kategori === "LBS") out.LBS++;
      if (n.kategori === "REC") out.REC++;
    });
    return out;
  }, [nodesRaw]);

  const penyulangOptions = useMemo(() => {
    const s = new Set<string>();

    PENYULANG_OPTIONS.forEach((x) => {
      const v = String(x || "").trim();
      if (v) s.add(v);
    });

    manualLines.forEach((x) => {
      const v = String(x?.penyulang || "").trim();
      if (v) s.add(v);
    });

    const editVal = String(lineEditDraft?.penyulang || "").trim();
    if (editVal) s.add(editVal);

    const draftVal = String(draftLine?.penyulang || "").trim();
    if (draftVal) s.add(draftVal);

    return Array.from(s);
  }, [manualLines, lineEditDraft?.penyulang, draftLine?.penyulang]);

  const currentPenyulangValue = useMemo(() => {
    if (selectedLineId && lineEditDraft) return lineEditDraft.penyulang || "";
    return draftLine?.penyulang || "";
  }, [selectedLineId, lineEditDraft, draftLine]);

  const handlePanelPenyulangChange = useCallback((value: string) => {
    if (selectedLineId) {
      setLineEditDraft((prev) => (prev ? { ...prev, penyulang: value } : prev));
      return;
    }

    setDraftLine((prev) => ({
      ...(prev || emptyDraftLine()),
      penyulang: value,
    }));
  }, [selectedLineId]);

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

  const addNewBranch = useCallback(() => {
    if (!editMode) return;

    const factory = (prev: RouteBranch[]) => {
      const name = nextBranchName(prev);
      const next: RouteBranch[] = [...prev, { id: makeBranchId(), name, points: [] }];
      const justAdded = next[next.length - 1];
      setActiveRouteKey(justAdded.id);
      setActiveInputMode("pole");
      setEditorMsg(`${name} ditambahkan. Klik tiang untuk cabang, atau ganti mode ke BELOKAN untuk bikin tikungan.`);
      return next;
    };

    if (selectedLineId) {
      setLineEditBranches(factory);
    } else {
      setDraftBranches(factory);
    }
  }, [editMode, selectedLineId]);

  const removeActiveBranch = useCallback(() => {
    if (activeRouteKey === "main") return;
    const target = currentBranches.find((b) => b.id === activeRouteKey);
    if (!target) return;
    if (!window.confirm(`Hapus ${target.name}?`)) return;

    if (selectedLineId) {
      setLineEditBranches((prev) => prev.filter((b) => b.id !== activeRouteKey));
    } else {
      setDraftBranches((prev) => prev.filter((b) => b.id !== activeRouteKey));
    }

    setActiveRouteKey("main");
    setEditorMsg(`${target.name} dihapus.`);
  }, [activeRouteKey, currentBranches, selectedLineId]);

  const undoLastPointInActiveRoute = useCallback(() => {
    if (activeRouteKey === "main") {
      if (selectedLineId) {
        setLineEditPoleRoute((prev) => prev.slice(0, -1));
      } else {
        setDraftPoleRoute((prev) => prev.slice(0, -1));
      }
    } else {
      if (selectedLineId) {
        setLineEditBranches((prev) =>
          prev.map((b) =>
            b.id === activeRouteKey ? { ...b, points: b.points.slice(0, -1) } : b
          )
        );
      } else {
        setDraftBranches((prev) =>
          prev.map((b) =>
            b.id === activeRouteKey ? { ...b, points: b.points.slice(0, -1) } : b
          )
        );
      }
    }

    setEditorMsg(`Titik terakhir dihapus dari jalur ${activeRouteLabel}.`);
  }, [activeRouteKey, activeRouteLabel, selectedLineId]);

  const resetActiveRoutePoints = useCallback(() => {
    if (activeRouteKey === "main") {
      if (selectedLineId) {
        setLineEditPoleRoute([]);
      } else {
        setDraftPoleRoute([]);
      }
    } else {
      if (selectedLineId) {
        setLineEditBranches((prev) =>
          prev.map((b) =>
            b.id === activeRouteKey ? { ...b, points: [] } : b
          )
        );
      } else {
        setDraftBranches((prev) =>
          prev.map((b) =>
            b.id === activeRouteKey ? { ...b, points: [] } : b
          )
        );
      }
    }

    setEditorMsg(`Semua titik di jalur ${activeRouteLabel} di-reset.`);
  }, [activeRouteKey, activeRouteLabel, selectedLineId]);

  const removePointFromActiveRoute = useCallback(
    (pointKey: string) => {
      if (activeRouteKey === "main") {
        if (selectedLineId) {
          setLineEditPoleRoute((prev) => prev.filter((x) => x.key !== pointKey));
        } else {
          setDraftPoleRoute((prev) => prev.filter((x) => x.key !== pointKey));
        }
      } else {
        if (selectedLineId) {
          setLineEditBranches((prev) =>
            prev.map((b) =>
              b.id === activeRouteKey
                ? { ...b, points: b.points.filter((x) => x.key !== pointKey) }
                : b
            )
          );
        } else {
          setDraftBranches((prev) =>
            prev.map((b) =>
              b.id === activeRouteKey
                ? { ...b, points: b.points.filter((x) => x.key !== pointKey) }
                : b
            )
          );
        }
      }

      setEditorMsg(`Titik dilepas dari jalur ${activeRouteLabel}.`);
    },
    [activeRouteKey, activeRouteLabel, selectedLineId]
  );

  const handleAddVertexToActiveRoute = useCallback(
    (lat: number, lng: number) => {
      if (!editMode || pickMode || !activeLineEndpoints) return;
      const vertex = makeVertexPoint(lat, lng);

      if (activeRouteKey === "main") {
        if (selectedLineId) {
          setLineEditPoleRoute((prev) => [...prev, vertex]);
        } else {
          setDraftPoleRoute((prev) => [...prev, vertex]);
        }
      } else {
        if (selectedLineId) {
          setLineEditBranches((prev) =>
            prev.map((b) =>
              b.id === activeRouteKey ? { ...b, points: [...b.points, vertex] } : b
            )
          );
        } else {
          setDraftBranches((prev) =>
            prev.map((b) =>
              b.id === activeRouteKey ? { ...b, points: [...b.points, vertex] } : b
            )
          );
        }
      }

      setEditorMsg(`Belokan ditambahkan ke jalur ${activeRouteLabel}.`);
    },
    [editMode, pickMode, activeLineEndpoints, activeRouteKey, activeRouteLabel, selectedLineId]
  );

  const handleNodePickedForEditor = useCallback(
    (group: NodeGroup) => {
      if (!editMode) return;

      const endpoint = makeEndpointFromGroup(group);

      if (!selectedLineId && (pickMode === null || pickMode === "draft_from")) {
        setDraftPoleRoute([]);
        setDraftBranches([]);
        setActiveRouteKey("main");
        setActiveInputMode("pole");
        if (endpoint.ulp) setSelectedUlp(endpoint.ulp);
        setDraftLine((prev) => ({
          ...(prev || emptyDraftLine()),
          from: endpoint,
          to: prev?.to && sameEndpoint(prev.to, endpoint) ? null : prev?.to || null,
        }));
        setPickMode("draft_to");
        setEditorMsg("Titik awal dipilih. Sekarang pilih titik akhir.");
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
        if (endpoint.ulp) setSelectedUlp(endpoint.ulp);
        setDraftPoleRoute([]);
        setDraftBranches([]);
        setActiveRouteKey("main");
        setActiveInputMode("pole");
        setPickMode(null);
        setEditorMsg("Titik akhir dipilih. Sekarang pilih TIANG atau mode BELOKAN.");
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
        if (endpoint.ulp) setSelectedUlp(endpoint.ulp);
        setLineEditPoleRoute([]);
        setLineEditBranches([]);
        setActiveRouteKey("main");
        setActiveInputMode("pole");
        setPickMode(null);
        setEditorMsg("Titik awal diganti.");
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
        if (endpoint.ulp) setSelectedUlp(endpoint.ulp);
        setLineEditPoleRoute([]);
        setLineEditBranches([]);
        setActiveRouteKey("main");
        setActiveInputMode("pole");
        setPickMode(null);
        setEditorMsg("Titik akhir diganti.");
      }
    },
    [editMode, pickMode, selectedLineId]
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

  const togglePoleInCurrentRoute = useCallback(
    (pole: PoleGroup) => {
      const point: RoutePathPoint = {
        key: pole.key,
        latitude: pole.latitude,
        longitude: pole.longitude,
        kind: "pole",
      };

      const toggleArr = (prev: RoutePathPoint[]) => {
        const exists = prev.some((x) => x.key === pole.key);
        const next = exists ? prev.filter((x) => x.key !== pole.key) : [...prev, point];
        setEditorMsg(
          exists
            ? `Tiang dilepas dari jalur ${activeRouteLabel}. Total titik: ${next.length}`
            : `Tiang ditambahkan ke jalur ${activeRouteLabel}. Total titik: ${next.length}`
        );
        return next;
      };

      if (activeRouteKey === "main") {
        if (selectedLineId) {
          setLineEditPoleRoute(toggleArr);
        } else {
          setDraftPoleRoute(toggleArr);
        }
        return;
      }

      if (selectedLineId) {
        setLineEditBranches((prev) =>
          prev.map((b) =>
            b.id === activeRouteKey ? { ...b, points: toggleArr(b.points) } : b
          )
        );
      } else {
        setDraftBranches((prev) =>
          prev.map((b) =>
            b.id === activeRouteKey ? { ...b, points: toggleArr(b.points) } : b
          )
        );
      }
    },
    [activeRouteKey, activeRouteLabel, selectedLineId]
  );

  const handlePoleClick = useCallback(
    (pole: PoleGroup) => {
      setSelectedPoint({ kind: "pole", data: pole });

      const canPickPole =
        editMode &&
        !pickMode &&
        !!activeLineEndpoints &&
        !shouldAggregatePoles &&
        activeInputMode === "pole";

      if (canPickPole) {
        togglePoleInCurrentRoute(pole);
        return;
      }

      focusTo(pole.latitude, pole.longitude);
    },
    [editMode, pickMode, activeLineEndpoints, togglePoleInCurrentRoute, focusTo, shouldAggregatePoles, activeInputMode]
  );

  const handleToggleEditMode = () => {
    const next = !editMode;
    setEditMode(next);

    if (next) {
      setSelectedLineId(null);
      setLineEditDraft(null);
      setLineEditPoleRoute([]);
      setLineEditBranches([]);
      setDraftLine(emptyDraftLine());
      setDraftPoleRoute([]);
      setDraftBranches([]);
      setActiveRouteKey("main");
      setActiveInputMode("pole");
      setPickMode("draft_from");
      setEditorMsg("Mode edit aktif. Pilih node awal-akhir. Setelah itu pilih mode TIANG atau BELOKAN.");
    } else {
      setSelectedLineId(null);
      setLineEditDraft(null);
      setLineEditPoleRoute([]);
      setLineEditBranches([]);
      setDraftLine(null);
      setDraftPoleRoute([]);
      setDraftBranches([]);
      setActiveRouteKey("main");
      setActiveInputMode("pole");
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
        ulp: selectedUlp || "",
        penyulang: draftLine.penyulang || "",
        pertemuan: buildLineName(draftLine.from, draftLine.to),
        kms: draftLine.kms || "",
        note: serializeLineNote(draftPoleRoute, draftBranches),

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

      const nextUlp = resp.line.ulp || resp.line.fromUlp || resp.line.toUlp || "";
      if (nextUlp) setSelectedUlp(nextUlp);

      setSelectedLineId(resp.line.id);
      setLineEditDraft(resp.line);
      setLineEditPoleRoute(draftPoleRoute);
      setLineEditBranches(draftBranches);
      setDraftLine(null);
      setDraftPoleRoute([]);
      setDraftBranches([]);
      setActiveRouteKey("main");
      setActiveInputMode("pole");
      setPickMode(null);
      setEditorMsg(`Data berhasil disimpan. Total titik manual: ${countAllRoutePoints(draftPoleRoute, draftBranches)}`);
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
        ulp: selectedUlp || lineEditDraft.ulp || "",
        penyulang: lineEditDraft.penyulang || "",
        pertemuan: lineEditDraft.pertemuan || `${lineEditDraft.fromName} - ${lineEditDraft.toName}`,
        kms: lineEditDraft.kms || "",
        note: serializeLineNote(lineEditPoleRoute, lineEditBranches),

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

      const nextUlp = resp.line.ulp || resp.line.fromUlp || resp.line.toUlp || "";
      if (nextUlp) setSelectedUlp(nextUlp);

      setLineEditDraft(resp.line);
      setEditorMsg(`Perubahan berhasil disimpan. Total titik manual: ${countAllRoutePoints(lineEditPoleRoute, lineEditBranches)}`);
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
      setLineEditPoleRoute([]);
      setLineEditBranches([]);
      setDraftLine(emptyDraftLine());
      setDraftPoleRoute([]);
      setDraftBranches([]);
      setActiveRouteKey("main");
      setActiveInputMode("pole");
      setPickMode("draft_from");
      setEditorMsg("Data berhasil dihapus.");
    } catch (e: any) {
      setEditorMsg("Gagal hapus data: " + String(e?.message || e));
    } finally {
      setLineBusy(false);
    }
  };

  const selectedPointPoleRouteIndex =
    selectedPoint?.kind === "pole"
      ? activePoleRouteIndexMap.get(selectedPoint.data.key) || -1
      : -1;

  const selectedPointIsSectionCandidate =
    selectedPoint?.kind === "pole"
      ? sectionPoleKeySet.has(selectedPoint.data.key)
      : false;

  const selectedPointIsInAnyRoute =
    selectedPoint?.kind === "pole"
      ? activePoleRouteKeySet.has(selectedPoint.data.key)
      : false;

  const nodesUseCanvas = nodeGroupsDisplayed.length > 1500;

  const currentMainPointCount = selectedLineId ? countRoutePoints(lineEditPoleRoute) : countRoutePoints(draftPoleRoute);
  const currentTotalPointCount = selectedLineId
    ? countAllRoutePoints(lineEditPoleRoute, lineEditBranches)
    : countAllRoutePoints(draftPoleRoute, draftBranches);

  const activeVertexPoints = useMemo(
    () => activeEditableRoutePoints.filter((p) => p.kind === "vertex"),
    [activeEditableRoutePoints]
  );

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
            width: 320,
            boxShadow: "0px 2px 10px rgba(0,0,0,0.2)",
            fontSize: 12,
            maxHeight: "42vh",
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
              <div style={{ marginTop: 4 }}>
                Section Highlight: <b>{selectedPointIsSectionCandidate ? "YA" : "TIDAK"}</b>
              </div>
              <div style={{ marginTop: 4 }}>
                Masuk Jalur: <b>{selectedPointIsInAnyRoute ? "YA" : "TIDAK"}</b>
              </div>
              <div style={{ marginTop: 4 }}>
                Jalur Aktif: <b>{activeRouteLabel}</b>
              </div>
              {selectedPointPoleRouteIndex >= 0 ? (
                <div style={{ marginTop: 4 }}>
                  Urutan Tiang ({activeRouteLabel}): <b>{selectedPointPoleRouteIndex}</b>
                </div>
              ) : null}
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
            width: 400,
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
              <div style={{ marginTop: 4, color: "#666" }}>Filter tiang per ULP.</div>
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
            <div style={{ fontWeight: 800 }}>Pilih ULP</div>
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
              style={{ width: "100%", padding: 8, marginTop: 8 }}
            >
              <option value="">-- pilih ULP --</option>
              {ulpList.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>

            <div style={{ marginTop: 8, color: "#666" }}>
              ULP cuma untuk filter tiang, bukan penentu penyulang final.
            </div>
          </div>

          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee" }}>
            <div style={{ fontWeight: 800 }}>Penyulang Aktif</div>

            <select
              value={currentPenyulangValue}
              onChange={(e) => handlePanelPenyulangChange(e.target.value)}
              style={{
                width: "100%",
                padding: 8,
                marginTop: 8,
                border: "1px solid #ddd",
                borderRadius: 8,
                background: "white",
              }}
            >
              <option value="">-- pilih penyulang --</option>
              {penyulangOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <div style={{ marginTop: 6, color: "#666" }}>
              Nilai penyulang di kotak kanan ini akan ikut tersimpan ke data garis.
            </div>
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
            <div style={{ fontWeight: 800 }}>Base Map</div>
            <select value={selectedBase} onChange={(e) => setSelectedBase(e.target.value as any)} style={{ width: "100%", padding: 6, marginTop: 8 }}>
              <option value="normal">Normal</option>
              <option value="satellite">Satellite</option>
            </select>
          </div>

          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee" }}>
            <div style={{ fontWeight: 800 }}>Tiang ULP Aktif</div>
            <div style={{ marginTop: 6, color: "#444" }}>
              ULP aktif: <b>{selectedUlp || "-"}</b>
            </div>
            <div style={{ marginTop: 4, color: "#444" }}>
              Tiang unik: <b>{bundleLoading ? "loading..." : poleGroups.length}</b>
            </div>
            <div style={{ marginTop: 4, color: "#444" }}>
              Tiang tampil: <b>{selectedUlp ? poleGroupsDisplayed.length : 0}</b>
            </div>
            <div style={{ marginTop: 4, color: "#444" }}>
              Tiang section highlight: <b>{sectionPoleCandidatesAll.length}</b>
            </div>
            <div style={{ marginTop: 4, color: "#666" }}>
              Zoom out kecil, zoom in membesar secukupnya.
            </div>
            {shouldAggregatePoles ? (
              <div style={{ marginTop: 4, color: "#ef6c00", fontWeight: 700 }}>
                Tiang sedang diringkas. Zoom in untuk pilih satu-satu.
              </div>
            ) : null}
          </div>

          {selectedLineId && lineEditDraft ? (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee" }}>
              <div style={{ fontWeight: 800 }}>Garis Terpilih</div>
              <div style={{ marginTop: 6, color: "#444" }}>
                Nama: <b>{lineEditDraft.pertemuan || `${lineEditDraft.fromName} - ${lineEditDraft.toName}`}</b>
              </div>
              <div style={{ marginTop: 4, color: "#444" }}>
                Penyulang: <b>{lineEditDraft.penyulang || "-"}</b>
              </div>
              <div style={{ marginTop: 4, color: "#444" }}>
                KMS: <b>{lineEditDraft.kms || "-"}</b>
              </div>
              <div style={{ marginTop: 4, color: "#444" }}>
                ULP: <b>{lineEditDraft.ulp || lineEditDraft.fromUlp || lineEditDraft.toUlp || "-"}</b>
              </div>
              <div style={{ marginTop: 4, color: "#444" }}>
                MAIN: <b>{lineEditPoleRoute.length}</b> titik
              </div>
              <div style={{ marginTop: 4, color: "#444" }}>
                Cabang: <b>{lineEditBranches.length}</b> jalur
              </div>
              <div style={{ marginTop: 4, color: "#444" }}>
                Total titik manual: <b>{countAllRoutePoints(lineEditPoleRoute, lineEditBranches)}</b>
              </div>
            </div>
          ) : null}

          <div style={{ marginTop: 10, color: "#444" }}>
            Zoom: <b>{currentZoom}</b> • viewportOnly: <b>{viewportOnly ? "ON" : "OFF"}</b>
            <br />
            GH/LBS/REC: <b>{nodesLoading ? "loading..." : "ok"}</b>
            <br />
            Garis Tersimpan: <b>{linesLoading ? "loading..." : manualLines.length}</b>
            <br />
            Garis Tampil: <b>{manualLinesDisplayed.length}</b>
            <br />
            GH: <b>{stats.GH}</b> • LBS: <b>{stats.LBS}</b> • REC: <b>{stats.REC}</b>
            {errMsg ? <div style={{ color: "#d32f2f", marginTop: 6 }}>{errMsg}</div> : null}
          </div>

          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={viewportOnly} onChange={(e) => setViewportOnly(e.target.checked)} />
              <span>Render hanya yang terlihat (garis tetap tampil semua)</span>
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
            width: 490,
            boxShadow: "0px 6px 20px rgba(0,0,0,0.22)",
            fontSize: 12,
            maxHeight: "52vh",
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
              {!pickMode && (selectedLineId ? `Edit ${activeRouteLabel}` : `Tambah ${activeRouteLabel}`)}
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
                <div style={{ fontWeight: 700 }}>Nama Section</div>
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
                    setDraftPoleRoute([]);
                    setDraftBranches([]);
                    setActiveRouteKey("main");
                    setActiveInputMode("pole");
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
                <div style={{ marginBottom: 4 }}>Penyulang</div>
                <select
                  value={draftLine?.penyulang || ""}
                  onChange={(e) =>
                    setDraftLine((prev) => ({
                      ...(prev || emptyDraftLine()),
                      penyulang: e.target.value,
                    }))
                  }
                  style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 8 }}
                >
                  <option value="">-- pilih penyulang --</option>
                  {penyulangOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #eee" }}>
                <div style={{ fontWeight: 800 }}>Jalur Manual / Belokan / Percabangan</div>
                <div style={{ marginTop: 4, color: "#666" }}>
                  TIANG = klik tiang. BELOKAN = klik area map untuk bikin titik sudut. MAIN = jalur utama. SECTION = cabang.
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <select
                    value={activeRouteKey}
                    onChange={(e) => setActiveRouteKey(e.target.value)}
                    style={{ flex: 1, padding: 8, border: "1px solid #ddd", borderRadius: 8 }}
                  >
                    <option value="main">MAIN</option>
                    {draftBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={addNewBranch}
                    disabled={lineBusy || !draftLine?.from || !draftLine?.to}
                    style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, background: "white", cursor: "pointer" }}
                  >
                    + Section
                  </button>

                  <button
                    onClick={removeActiveBranch}
                    disabled={lineBusy || activeRouteKey === "main"}
                    style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, background: "white", cursor: "pointer" }}
                  >
                    Hapus
                  </button>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    onClick={() => setActiveInputMode("pole")}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      border: activeInputMode === "pole" ? "1px solid #64b5f6" : "1px solid #ddd",
                      borderRadius: 8,
                      background: activeInputMode === "pole" ? "#f3f9ff" : "white",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    Mode TIANG
                  </button>
                  <button
                    onClick={() => setActiveInputMode("vertex")}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      border: activeInputMode === "vertex" ? "1px solid #ab47bc" : "1px solid #ddd",
                      borderRadius: 8,
                      background: activeInputMode === "vertex" ? "#faf2fd" : "white",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    Mode BELOKAN
                  </button>
                </div>

                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  <button
                    onClick={() => setActiveRouteKey("main")}
                    style={{
                      textAlign: "left",
                      padding: "8px 10px",
                      border: activeRouteKey === "main" ? "1px solid #64b5f6" : "1px solid #eee",
                      borderRadius: 8,
                      background: activeRouteKey === "main" ? "#f3f9ff" : "white",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>MAIN</div>
                    <div style={{ color: "#666", marginTop: 2 }}>{draftPoleRoute.length} titik</div>
                  </button>

                  {draftBranches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setActiveRouteKey(b.id)}
                      style={{
                        textAlign: "left",
                        padding: "8px 10px",
                        border: activeRouteKey === b.id ? "1px solid #64b5f6" : "1px solid #eee",
                        borderRadius: 8,
                        background: activeRouteKey === b.id ? "#f3f9ff" : "white",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{b.name}</div>
                      <div style={{ color: "#666", marginTop: 2 }}>{b.points.length} titik</div>
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: 8, color: "#444" }}>
                  Jalur aktif: <b>{activeRouteLabel}</b> • Mode input: <b>{activeInputMode === "pole" ? "TIANG" : "BELOKAN"}</b> • Total semua titik: <b>{currentTotalPointCount}</b>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    onClick={undoLastPointInActiveRoute}
                    disabled={lineBusy || activeEditableRoutePoints.length === 0}
                    style={{ padding: "7px 10px", border: "1px solid #ddd", borderRadius: 8, background: "white", cursor: "pointer" }}
                  >
                    Undo Titik
                  </button>
                  <button
                    onClick={resetActiveRoutePoints}
                    disabled={lineBusy || activeEditableRoutePoints.length === 0}
                    style={{ padding: "7px 10px", border: "1px solid #ddd", borderRadius: 8, background: "white", cursor: "pointer" }}
                  >
                    Reset Jalur Aktif
                  </button>
                </div>

                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6, maxHeight: 130, overflowY: "auto" }}>
                  {activeEditableRoutePoints.length === 0 ? (
                    <div style={{ color: "#777" }}>Belum ada titik di jalur {activeRouteLabel}.</div>
                  ) : (
                    activeEditableRoutePoints.map((p, idx) => (
                      <div
                        key={`${activeRouteLabel}-${p.key}`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 8,
                          padding: "7px 9px",
                          border: "1px solid #eee",
                          borderRadius: 8,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700 }}>
                            {activeRouteLabel} • {p.kind === "pole" ? "Tiang" : "Belokan"} #{idx + 1}
                          </div>
                          <div style={{ color: "#666", marginTop: 2 }}>{fmtCoord(p.latitude, p.longitude)}</div>
                        </div>
                        <button
                          onClick={() => removePointFromActiveRoute(p.key)}
                          style={{ padding: "6px 8px", border: "1px solid #ddd", borderRadius: 8, background: "white", cursor: "pointer" }}
                        >
                          Lepas
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ marginBottom: 4 }}>Panjang Section (KMS)</div>
                <input
                  value={draftLine?.kms || ""}
                  onChange={(e) =>
                    setDraftLine((prev) => ({
                      ...(prev || emptyDraftLine()),
                      kms: e.target.value,
                    }))
                  }
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
                <div style={{ fontWeight: 700 }}>Nama Section</div>
                <div style={{ marginTop: 4 }}>{lineEditDraft.pertemuan || `${lineEditDraft.fromName} - ${lineEditDraft.toName}`}</div>
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
                <div style={{ marginBottom: 4 }}>Penyulang</div>
                <select
                  value={lineEditDraft?.penyulang || ""}
                  onChange={(e) =>
                    setLineEditDraft((prev) =>
                      prev ? { ...prev, penyulang: e.target.value } : prev
                    )
                  }
                  style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 8 }}
                >
                  <option value="">-- pilih penyulang --</option>
                  {penyulangOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #eee" }}>
                <div style={{ fontWeight: 800 }}>Jalur Manual / Belokan / Percabangan</div>
                <div style={{ marginTop: 4, color: "#666" }}>
                  Klik tiang kalau mode TIANG. Klik area map kalau mode BELOKAN.
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <select
                    value={activeRouteKey}
                    onChange={(e) => setActiveRouteKey(e.target.value)}
                    style={{ flex: 1, padding: 8, border: "1px solid #ddd", borderRadius: 8 }}
                  >
                    <option value="main">MAIN</option>
                    {lineEditBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={addNewBranch}
                    disabled={lineBusy}
                    style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, background: "white", cursor: "pointer" }}
                  >
                    + Section
                  </button>

                  <button
                    onClick={removeActiveBranch}
                    disabled={lineBusy || activeRouteKey === "main"}
                    style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, background: "white", cursor: "pointer" }}
                  >
                    Hapus
                  </button>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    onClick={() => setActiveInputMode("pole")}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      border: activeInputMode === "pole" ? "1px solid #64b5f6" : "1px solid #ddd",
                      borderRadius: 8,
                      background: activeInputMode === "pole" ? "#f3f9ff" : "white",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    Mode TIANG
                  </button>
                  <button
                    onClick={() => setActiveInputMode("vertex")}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      border: activeInputMode === "vertex" ? "1px solid #ab47bc" : "1px solid #ddd",
                      borderRadius: 8,
                      background: activeInputMode === "vertex" ? "#faf2fd" : "white",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    Mode BELOKAN
                  </button>
                </div>

                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  <button
                    onClick={() => setActiveRouteKey("main")}
                    style={{
                      textAlign: "left",
                      padding: "8px 10px",
                      border: activeRouteKey === "main" ? "1px solid #64b5f6" : "1px solid #eee",
                      borderRadius: 8,
                      background: activeRouteKey === "main" ? "#f3f9ff" : "white",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>MAIN</div>
                    <div style={{ color: "#666", marginTop: 2 }}>{lineEditPoleRoute.length} titik</div>
                  </button>

                  {lineEditBranches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setActiveRouteKey(b.id)}
                      style={{
                        textAlign: "left",
                        padding: "8px 10px",
                        border: activeRouteKey === b.id ? "1px solid #64b5f6" : "1px solid #eee",
                        borderRadius: 8,
                        background: activeRouteKey === b.id ? "#f3f9ff" : "white",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{b.name}</div>
                      <div style={{ color: "#666", marginTop: 2 }}>{b.points.length} titik</div>
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: 8, color: "#444" }}>
                  Jalur aktif: <b>{activeRouteLabel}</b> • Mode input: <b>{activeInputMode === "pole" ? "TIANG" : "BELOKAN"}</b> • Total semua titik: <b>{currentTotalPointCount}</b>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    onClick={undoLastPointInActiveRoute}
                    disabled={lineBusy || activeEditableRoutePoints.length === 0}
                    style={{ padding: "7px 10px", border: "1px solid #ddd", borderRadius: 8, background: "white", cursor: "pointer" }}
                  >
                    Undo Titik
                  </button>
                  <button
                    onClick={resetActiveRoutePoints}
                    disabled={lineBusy || activeEditableRoutePoints.length === 0}
                    style={{ padding: "7px 10px", border: "1px solid #ddd", borderRadius: 8, background: "white", cursor: "pointer" }}
                  >
                    Reset Jalur Aktif
                  </button>
                </div>

                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6, maxHeight: 130, overflowY: "auto" }}>
                  {activeEditableRoutePoints.length === 0 ? (
                    <div style={{ color: "#777" }}>Belum ada titik di jalur {activeRouteLabel}.</div>
                  ) : (
                    activeEditableRoutePoints.map((p, idx) => (
                      <div
                        key={`${activeRouteLabel}-${p.key}`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 8,
                          padding: "7px 9px",
                          border: "1px solid #eee",
                          borderRadius: 8,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700 }}>
                            {activeRouteLabel} • {p.kind === "pole" ? "Tiang" : "Belokan"} #{idx + 1}
                          </div>
                          <div style={{ color: "#666", marginTop: 2 }}>{fmtCoord(p.latitude, p.longitude)}</div>
                        </div>
                        <button
                          onClick={() => removePointFromActiveRoute(p.key)}
                          style={{ padding: "6px 8px", border: "1px solid #ddd", borderRadius: 8, background: "white", cursor: "pointer" }}
                        >
                          Lepas
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ marginBottom: 4 }}>Panjang Section (KMS)</div>
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
                  setLineEditPoleRoute([]);
                  setLineEditBranches([]);
                  setDraftLine(emptyDraftLine());
                  setDraftPoleRoute([]);
                  setDraftBranches([]);
                  setActiveRouteKey("main");
                  setActiveInputMode("pole");
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
            Daftar Garis ({manualLines.length})
          </div>

          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto" }}>
            {manualLines.length === 0 ? (
              <div style={{ color: "#777" }}>Belum ada data tersimpan.</div>
            ) : (
              manualLines.map((line) => {
                const savedMain = getMainRoutePointsFromLine(line);
                const savedBranches = getBranchesFromLine(line);
                const savedTotal = countAllRoutePoints(savedMain, savedBranches);

                return (
                  <button
                    key={line.id}
                    onClick={() => {
                      const nextUlp = line.ulp || line.fromUlp || line.toUlp || "";
                      if (nextUlp) setSelectedUlp(nextUlp);
                      setSelectedLineId(line.id);
                      setDraftLine(null);
                      setDraftPoleRoute([]);
                      setDraftBranches([]);
                      setActiveRouteKey("main");
                      setActiveInputMode("pole");
                      setPickMode(null);
                      setEditorMsg("Data dipilih.");
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
                      Penyulang: {line.penyulang || "-"} • KMS: {line.kms || "-"}
                    </div>
                    <div style={{ color: "#666", marginTop: 2 }}>
                      MAIN: {savedMain.length} • Cabang: {savedBranches.length} • Total titik: {savedTotal}
                    </div>
                  </button>
                );
              })
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
        <MapClickCapture
          enabled={editMode && !pickMode && !!activeLineEndpoints && activeInputMode === "vertex" && !ssMode}
          onClickMap={handleAddVertexToActiveRoute}
        />

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
              weight: 4.6,
              opacity: 0.95,
              dashArray: draftPoleRoute.length ? undefined : "8 8",
            }}
          />
        )}

        {draftBranchPathList.map((b) => (
          <Polyline
            key={`draft-branch-${b.id}`}
            positions={b.positions as any}
            pathOptions={{
              color: COLOR_DRAFT_LINE,
              weight: 3.9,
              opacity: 0.92,
            }}
          >
            {!ssMode && (
              <Tooltip sticky direction="top" opacity={1}>
                <div style={{ fontSize: 12 }}>
                  <div style={{ fontWeight: 700 }}>{b.name}</div>
                  <div style={{ color: "#666", marginTop: 4 }}>
                    Titik: {draftBranches.find((x) => x.id === b.id)?.points.length || 0}
                  </div>
                </div>
              </Tooltip>
            )}
          </Polyline>
        ))}

        {manualLinesDisplayed.map((l) => {
          const isSelected = selectedLineId === l.id;
          const bundle = manualLinePathMap.get(l.id) || {
            main: [
              [l.fromLat, l.fromLng],
              [l.toLat, l.toLng],
            ],
            branches: [],
          };

          const currentMain = isSelected ? lineEditPoleRoute : getMainRoutePointsFromLine(l);
          const currentBranchesForLine = isSelected ? lineEditBranches : getBranchesFromLine(l);
          const manualPointCount = countAllRoutePoints(currentMain, currentBranchesForLine);

          const commonEvent = {
            click: () => {
              const nextUlp = l.ulp || l.fromUlp || l.toUlp || "";
              if (nextUlp) setSelectedUlp(nextUlp);
              setSelectedLineId(l.id);
              setDraftLine(null);
              setDraftPoleRoute([]);
              setDraftBranches([]);
              setActiveRouteKey("main");
              setActiveInputMode("pole");
              setPickMode(null);
              setEditorMsg("Garis dipilih.");
            },
          };

          return (
            <Fragment key={l.id}>
              <Polyline
                positions={bundle.main as any}
                pathOptions={{
                  color: isSelected ? COLOR_SELECTED_LINE : COLOR_MANUAL_LINE,
                  weight: isSelected ? 5.3 : 3.5,
                  opacity: 0.92,
                }}
                eventHandlers={commonEvent}
              >
                {!ssMode && (
                  <Tooltip sticky direction="top" opacity={1}>
                    <div style={{ fontSize: 12, minWidth: 220 }}>
                      <div style={{ fontWeight: 700 }}>{l.pertemuan || `${l.fromName} - ${l.toName}`}</div>
                      <div style={{ color: "#666", marginTop: 4 }}>Penyulang: {l.penyulang || "-"}</div>
                      <div style={{ color: "#666" }}>KMS: {l.kms || "-"}</div>
                      <div style={{ color: "#666" }}>Total titik manual: {manualPointCount}</div>
                      <div style={{ color: "#666" }}>ULP Source: {l.ulp || l.fromUlp || l.toUlp || "-"}</div>
                    </div>
                  </Tooltip>
                )}
              </Polyline>

              {bundle.branches.map((br) => (
                <Polyline
                  key={`${l.id}-${br.id}`}
                  positions={br.positions as any}
                  pathOptions={{
                    color: isSelected ? COLOR_SELECTED_LINE : COLOR_MANUAL_LINE,
                    weight: isSelected ? 4.2 : 2.9,
                    opacity: 0.9,
                  }}
                  eventHandlers={commonEvent}
                >
                  {!ssMode && (
                    <Tooltip sticky direction="top" opacity={1}>
                      <div style={{ fontSize: 12, minWidth: 180 }}>
                        <div style={{ fontWeight: 700 }}>{br.name}</div>
                        <div style={{ color: "#666", marginTop: 4 }}>
                          Titik: {currentBranchesForLine.find((x) => x.id === br.id)?.points.length || 0}
                        </div>
                      </div>
                    </Tooltip>
                  )}
                </Polyline>
              ))}
            </Fragment>
          );
        })}

        {activeVertexPoints.map((p, idx) => (
          <CircleMarker
            key={`vertex-${p.key}`}
            center={[p.latitude, p.longitude]}
            radius={Math.max(3.5, poleCanvasRadius * 0.95)}
            pathOptions={{
              color: COLOR_VERTEX.stroke,
              weight: 2,
              fillColor: COLOR_VERTEX.fill,
              fillOpacity: 0.95,
            }}
          >
            {!ssMode && (
              <Tooltip sticky direction="top" opacity={1}>
                <div style={{ fontSize: 12 }}>
                  <div style={{ fontWeight: 700 }}>
                    BELOKAN #{idx + 1} • {activeRouteLabel}
                  </div>
                  <div style={{ color: "#666", marginTop: 4 }}>{fmtCoord(p.latitude, p.longitude)}</div>
                </div>
              </Tooltip>
            )}
          </CircleMarker>
        ))}

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
            <Marker
              key={n.key}
              position={[n.latitude, n.longitude]}
              icon={iconByKategori(n.kategori)}
              eventHandlers={{ click: () => handleNodeClick(n) }}
            >
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
          (shouldAggregatePoles
            ? poleAggregateCells.map((cell) => {
              const color = cell.hasSelectedRoutePole
                ? COLOR_TIANG_SELECTED
                : cell.hasSectionPole
                  ? COLOR_TIANG_SECTION
                  : COLOR_TIANG_BASE;

              const radius = Math.min(10.5, 3 + Math.log2(cell.count + 1));

              return (
                <CircleMarker
                  key={`pole-agg-${cell.key}`}
                  center={[cell.latitude, cell.longitude]}
                  radius={radius}
                  pathOptions={{
                    color: color.stroke,
                    weight: cell.hasSelectedRoutePole ? 2.1 : cell.hasSectionPole ? 1.5 : 1.05,
                    fillColor: color.fill,
                    fillOpacity: cell.hasSelectedRoutePole ? 0.96 : cell.hasSectionPole ? 0.86 : 0.62,
                  }}
                  eventHandlers={{
                    click: () => focusTo(cell.latitude, cell.longitude),
                  }}
                >
                  {!ssMode && (
                    <Tooltip sticky direction="top" opacity={1}>
                      <div style={{ fontSize: 12 }}>
                        <div style={{ fontWeight: 700 }}>Cluster Tiang</div>
                        <div style={{ color: "#666", marginTop: 4 }}>
                          Jumlah tiang: <b>{cell.count}</b>
                        </div>
                        <div style={{ color: "#666" }}>
                          ULP: {cell.ulps.slice(0, 3).join(", ") || "-"}
                          {cell.ulps.length > 3 ? " ..." : ""}
                        </div>
                        <div style={{ marginTop: 4, color: "#ef6c00" }}>Klik untuk zoom in</div>
                      </div>
                    </Tooltip>
                  )}
                </CircleMarker>
              );
            })
            : poleGroupsDisplayed.map((g) => {
              const isSelectedRoutePole = activePoleRouteKeySet.has(g.key);
              const isSectionPole = sectionPoleKeySet.has(g.key);
              const selectedOrder = activePoleRouteIndexMap.get(g.key);

              const color = isSelectedRoutePole
                ? COLOR_TIANG_SELECTED
                : isSectionPole
                  ? COLOR_TIANG_SECTION
                  : COLOR_TIANG_BASE;

              const radius = isSelectedRoutePole
                ? poleCanvasRadius + 1.5
                : isSectionPole
                  ? poleCanvasRadius + 0.7
                  : poleCanvasRadius;

              return (
                <CircleMarker
                  key={`pole-${g.key}`}
                  center={[g.latitude, g.longitude]}
                  radius={radius}
                  pathOptions={{
                    color: color.stroke,
                    weight: isSelectedRoutePole ? 2.2 : isSectionPole ? 1.6 : 1.05,
                    fillColor: color.fill,
                    fillOpacity: isSelectedRoutePole ? 0.96 : isSectionPole ? 0.84 : 0.66,
                  }}
                  eventHandlers={{ click: () => handlePoleClick(g) }}
                >
                  {!ssMode && (
                    <Tooltip sticky direction="top" opacity={1}>
                      <div style={{ fontSize: 12 }}>
                        <div style={{ fontWeight: 700 }}>
                          TIANG {selectedOrder ? `#${selectedOrder}` : ""}
                        </div>
                        <div style={{ color: "#666", marginTop: 4 }}>{fmtCoord(g.latitude, g.longitude)}</div>
                        <div style={{ marginTop: 4 }}>
                          ULP: <b>{g.ulp || "-"}</b>
                        </div>
                        <div style={{ color: "#666" }}>
                          Masuk jalur aktif: <b>{isSelectedRoutePole ? "YA" : "TIDAK"}</b>
                        </div>
                        <div style={{ color: "#666" }}>
                          Jalur aktif: <b>{activeRouteLabel}</b>
                        </div>
                        <div style={{ color: "#666" }}>
                          Masuk section highlight: <b>{isSectionPole ? "YA" : "TIDAK"}</b>
                        </div>
                      </div>
                    </Tooltip>
                  )}
                </CircleMarker>
              );
            }))}
      </MapContainer>
    </div>
  );
}