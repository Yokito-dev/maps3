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

const ULP_ALIAS_MAP: Record<string, string[]> = {
  "ULP.32111": ["PANAKKUKANG", "PANAKKUKANG - MATTOANGIN"],
};

type NodeKategori = "GH" | "LBS" | "REC";

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

type NetworkRowRaw = {
  id: string;
  rowId: number;
  section: string;
  segment: string;
  pertemuan: string;
  kms: string;
};

type AutoLink = {
  id: string;
  rowId: number;
  up3: string;
  ulp: string;
  section: string;
  segment: string;
  pertemuan: string;
  kms: string;
  sourceText: string;

  fromName: string;
  fromKategori: string;
  fromUlp: string;
  fromLat: number;
  fromLng: number;

  toName: string;
  toKategori: string;
  toUlp: string;
  toLat: number;
  toLng: number;
};

type SelectedPoint =
  | { kind: "pole"; data: PoleGroup }
  | { kind: "node"; data: NodeGroup };

type IndexedNode = NodePointRaw & {
  variants: string[];
  tokens: string[];
  searchText: string;
};

type NodeIndex = {
  variantMap: Map<string, IndexedNode[]>;
  all: IndexedNode[];
};

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

function samePoint(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  return Math.abs(a.latitude - b.latitude) < 1e-9 && Math.abs(a.longitude - b.longitude) < 1e-9;
}

function nodeSearchText(n: NodePointRaw) {
  return [n.kategori, n.keypoint, n.status, n.ulp, n.up3].join(" ").toLowerCase();
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
        String(raw).toLowerCase().trim() === String(v).toLowerCase().trim()
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

function normalizeLooseText(s: string) {
  let t = String(s || "").toUpperCase();

  t = t.replace(/\bRECLOSER\b/g, "REC");
  t = t.replace(/\bRECL\b/g, "REC");
  t = t.replace(/\bRECOLOSER\b/g, "REC");

  t = t.replace(/[_\/\\.,;:()\[\]{}]+/g, " ");
  t = t.replace(/&/g, " ");
  t = t.replace(/-/g, " ");
  t = t.replace(/\s+/g, " ").trim();

  return t;
}

function normalizeCompactText(s: string) {
  return normalizeLooseText(s).replace(/\s+/g, "");
}

function detectKategoriFromText(s: string) {
  const t = normalizeLooseText(s);
  if (/^GH\b/.test(t)) return "GH";
  if (/^LBS\b/.test(t)) return "LBS";
  if (/^REC\b/.test(t)) return "REC";
  if (/^PANGKAL\b/.test(t)) return "PANGKAL";
  return "";
}

function tokenize(s: string) {
  let t = normalizeLooseText(s);

  t = t
    .replace(/\b(MTRZ|MOTORIZE|MTR|OPEN|CLOSE|NORMAL|NC|NO)\b/g, " ")
    .replace(/\b(DS|PMT|SKTM|SUTM|JTM|TM)\b/g, " ")
    .replace(/\b(FCO)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!t) return [];
  return uniqArr(t.split(" ").filter(Boolean));
}

function normalizeNameVariants(s: string) {
  const set = new Set<string>();

  const add = (x: string) => {
    const loose = normalizeLooseText(x);
    if (!loose) return;
    set.add(loose);

    const compact = normalizeCompactText(loose);
    if (compact) set.add(compact);
  };

  const a = normalizeLooseText(s);
  add(a);

  const b = a.replace(/\bFCO\b/g, " ").replace(/\s+/g, " ").trim();
  add(b);

  const c = b.replace(/^(GH|LBS|REC)\s+/, "").trim();
  add(c);

  const d = c
    .replace(/\bDS\b/g, " ")
    .replace(/\bPMT\b/g, " ")
    .replace(/\bOPEN\b/g, " ")
    .replace(/\bCLOSE\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  add(d);

  if (d) {
    add(`GH ${d}`);
    add(`LBS ${d}`);
    add(`REC ${d}`);
  }

  return Array.from(set).filter(Boolean);
}

function explodeEndpointSide(sideText: string) {
  const raw = String(sideText || "").trim();
  if (!raw) return [];

  return raw
    .split(/\s*(?:&|\/|,|\bDAN\b|\bAND\b)\s*/i)
    .map((x) => String(x || "").trim())
    .filter(Boolean);
}

function splitPertemuan(txt: string) {
  const raw = String(txt || "").trim();
  if (!raw) return null;

  const normalized = raw.replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();

  const parts = normalized.split(/\s(?:-|=)\s/);
  if (parts.length < 2) return null;

  const leftRaw = String(parts[0] || "").trim();
  const rightRaw = String(parts.slice(1).join(" - ") || "").trim();

  const leftNames = explodeEndpointSide(leftRaw);
  const rightNames = explodeEndpointSide(rightRaw);

  if (!leftNames.length || !rightNames.length) return null;

  return { leftRaw, rightRaw, leftNames, rightNames };
}

function buildNodeIndex(nodes: NodePointRaw[]): NodeIndex {
  const variantMap = new Map<string, IndexedNode[]>();
  const all: IndexedNode[] = [];

  for (const n of nodes) {
    const variants = normalizeNameVariants(n.keypoint);
    let tokenBag: string[] = [];

    variants.forEach((v) => {
      tokenBag = tokenBag.concat(tokenize(v));
    });

    const item: IndexedNode = {
      ...n,
      variants,
      tokens: uniqArr(tokenBag),
      searchText: variants.join(" || "),
    };

    all.push(item);

    variants.forEach((v) => {
      const key1 = `${n.kategori}|${v}`;
      const key2 = `ANY|${v}`;

      if (!variantMap.has(key1)) variantMap.set(key1, []);
      if (!variantMap.has(key2)) variantMap.set(key2, []);

      variantMap.get(key1)!.push(item);
      variantMap.get(key2)!.push(item);
    });
  }

  return { variantMap, all };
}

function uniqueIndexedNodes(arr: IndexedNode[]) {
  const m = new Map<string, IndexedNode>();
  arr.forEach((x) => {
    const k = `${x.kategori}|${x.keypoint}|${x.latitude}|${x.longitude}`;
    m.set(k, x);
  });
  return Array.from(m.values());
}

function scoreNodeMatch(name: string, node: IndexedNode, desiredKategori: string) {
  const reqVars = normalizeNameVariants(name);

  let reqTokens: string[] = [];
  reqVars.forEach((v) => {
    reqTokens = reqTokens.concat(tokenize(v));
  });
  reqTokens = uniqArr(reqTokens);

  let score = 0;

  if (desiredKategori && node.kategori === desiredKategori) score += 260;
  if (desiredKategori && node.kategori !== desiredKategori) score -= 120;

  for (const rv of reqVars) {
    if (!rv) continue;

    if (node.variants.includes(rv)) {
      score = Math.max(score, 1600);
    }

    for (const nv of node.variants) {
      if (!nv) continue;

      if (nv === rv) {
        score = Math.max(score, 1600);
      } else if (nv.includes(rv) || rv.includes(nv)) {
        score = Math.max(score, 1200 - Math.min(220, Math.abs(nv.length - rv.length)));
      }
    }
  }

  let overlap = 0;
  for (const t of reqTokens) {
    if (node.tokens.includes(t)) overlap++;
  }

  score += overlap * 70;

  if (reqTokens.length && overlap === reqTokens.length) {
    score += 180;
  } else if (overlap >= Math.max(2, Math.ceil(reqTokens.length * 0.6))) {
    score += 100;
  }

  return score;
}

function resolveNodeByName(name: string, nodeIndex: NodeIndex): IndexedNode | null {
  const desiredKategori = detectKategoriFromText(name);

  if (desiredKategori === "PANGKAL" || /\bPANGKAL\b/i.test(String(name || ""))) return null;

  const vars = normalizeNameVariants(name);
  let hits: IndexedNode[] = [];

  for (const v of vars) {
    const key = `${desiredKategori || "ANY"}|${v}`;
    if (nodeIndex.variantMap.has(key)) hits = hits.concat(nodeIndex.variantMap.get(key)!);
  }

  hits = uniqueIndexedNodes(hits);

  const candidates = hits.length ? hits : nodeIndex.all.slice();

  let best: IndexedNode | null = null;
  let bestScore = -1;

  for (const node of candidates) {
    const sc = scoreNodeMatch(name, node, desiredKategori);
    if (sc > bestScore) {
      bestScore = sc;
      best = node;
    }
  }

  if (best && bestScore >= 180) return best;
  return null;
}

function buildEndpointGuessList(name: string, oppositeName: string, section: string, segment: string) {
  const out: string[] = [];
  const add = (x: string) => {
    const s = String(x || "").trim();
    if (s) out.push(s);
  };

  const nameLoose = normalizeLooseText(name);
  const oppLoose = normalizeLooseText(oppositeName);
  const secLoose = normalizeLooseText(section);
  const segLoose = normalizeLooseText(segment);

  add(name);
  add(nameLoose);

  const hasKategori = !!detectKategoriFromText(nameLoose);
  const genericHint = /\b(UJUNG|JARING|FCO|OPEN|CLOSE)\b/.test(nameLoose);

  if (!hasKategori && genericHint) {
    const contexts: string[] = [];

    const oppCore = oppLoose.replace(/^(GH|LBS|REC)\s+/, "").trim();
    const secCore = secLoose.replace(/^(GH|LBS|REC)\s+/, "").trim();
    const segCore = segLoose.replace(/^(GH|LBS|REC)\s+/, "").trim();

    if (oppCore) contexts.push(oppCore);
    if (secCore) contexts.push(secCore);
    if (segCore) contexts.push(segCore);

    uniqArr(contexts).forEach((ctx) => {
      add(`${nameLoose} ${ctx}`);
      add(`${ctx} ${nameLoose}`);

      add(`GH ${ctx} ${nameLoose}`);
      add(`LBS ${ctx} ${nameLoose}`);
      add(`REC ${ctx} ${nameLoose}`);

      add(`GH ${nameLoose} ${ctx}`);
      add(`LBS ${nameLoose} ${ctx}`);
      add(`REC ${nameLoose} ${ctx}`);
    });
  }

  return uniqArr(out);
}

function resolveNodeByNameWithContext(
  name: string,
  oppositeName: string,
  section: string,
  segment: string,
  nodeIndex: NodeIndex
) {
  const guesses = buildEndpointGuessList(name, oppositeName, section, segment);

  let best: IndexedNode | null = null;
  let bestScore = -1;

  for (const g of guesses) {
    const found = resolveNodeByName(g, nodeIndex);
    if (!found) continue;

    const sc = scoreNodeMatch(g, found, detectKategoriFromText(g));
    if (sc > bestScore) {
      bestScore = sc;
      best = found;
    }
  }

  return best;
}

function resolveLinksFromRows(rows: NetworkRowRaw[], nodes: NodePointRaw[], selectedUlp: string) {
  const nodeIndex = buildNodeIndex(nodes);

  const out: AutoLink[] = [];
  const dedupRaw = new Set<string>();
  const dedupPair = new Set<string>();
  let unmatchedCount = 0;

  for (const row of rows) {
    const rawKey = [row.section, row.segment, row.pertemuan].join(" | ");
    if (dedupRaw.has(rawKey)) continue;
    dedupRaw.add(rawKey);

    const sourceCandidates = uniqArr([row.pertemuan, row.segment].filter(Boolean));
    let linkedThisRow = false;

    for (const sourceText of sourceCandidates) {
      const parsed = splitPertemuan(sourceText);
      if (!parsed) continue;

      let madeLinkFromThisSource = false;

      for (const leftName of parsed.leftNames) {
        for (const rightName of parsed.rightNames) {
          if (/\bPANGKAL\b/i.test(leftName) || /\bPANGKAL\b/i.test(rightName)) continue;

          const left = resolveNodeByNameWithContext(leftName, rightName, row.section, row.segment, nodeIndex);
          const right = resolveNodeByNameWithContext(rightName, leftName, row.section, row.segment, nodeIndex);

          if (!left || !right) continue;
          if (samePoint(left, right)) continue;

          const aKey = `${left.kategori}|${left.keypoint}|${left.latitude}|${left.longitude}`;
          const bKey = `${right.kategori}|${right.keypoint}|${right.latitude}|${right.longitude}`;
          const pairKey = aKey < bKey ? `${aKey}__${bKey}` : `${bKey}__${aKey}`;

          if (dedupPair.has(pairKey)) continue;
          dedupPair.add(pairKey);

          out.push({
            id: `${row.rowId}__${leftName}__${rightName}`,
            rowId: row.rowId,
            up3: UP3,
            ulp: selectedUlp || "",
            section: row.section || "",
            segment: row.segment || "",
            pertemuan: row.pertemuan || "",
            kms: row.kms || "",
            sourceText: sourceText || "",

            fromName: left.keypoint || leftName || "",
            fromKategori: left.kategori || "",
            fromUlp: left.ulp || "",
            fromLat: left.latitude,
            fromLng: left.longitude,

            toName: right.keypoint || rightName || "",
            toKategori: right.kategori || "",
            toUlp: right.ulp || "",
            toLat: right.latitude,
            toLng: right.longitude,
          });

          madeLinkFromThisSource = true;
          linkedThisRow = true;
        }
      }

      if (madeLinkFromThisSource) break;
    }

    if (!linkedThisRow) unmatchedCount++;
  }

  const aliases = getUlpAliases(selectedUlp);
  const filteredLinks =
    aliases.length > 0
      ? out.filter((l) => ulpMatchesAnyAlias(l.fromUlp, aliases) || ulpMatchesAnyAlias(l.toUlp, aliases))
      : out;

  return {
    links: filteredLinks,
    unmatchedCount,
  };
}

const COLOR_TIANG = { stroke: "#1565c0", fill: "#1e88e5" };
const COLOR_GH = { stroke: "#111111", fill: "#424242" };
const COLOR_LBS = { stroke: "#ad1457", fill: "#e91e63" };
const COLOR_REC = { stroke: "#2e7d32", fill: "#43a047" };
const COLOR_AUTO_LINE = "#e53935";

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

export default function MapsPage() {
  const [mounted, setMounted] = useState(false);
  const [map, setMap] = useState<LeafletMap | null>(null);

  const [selectedBase, setSelectedBase] = useState<"normal" | "satellite">("normal");
  const [ssMode, setSsMode] = useState(false);

  const [ulpList, setUlpList] = useState<string[]>([]);
  const [ulpLoading, setUlpLoading] = useState(false);
  const [selectedUlp, setSelectedUlp] = useState("");

  const [polesRaw, setPolesRaw] = useState<PolePointRaw[]>([]);
  const [nodesRaw, setNodesRaw] = useState<NodePointRaw[]>([]);
  const [networkRows, setNetworkRows] = useState<NetworkRowRaw[]>([]);

  const [bundleLoading, setBundleLoading] = useState(false);
  const [nodesLoading, setNodesLoading] = useState(false);
  const [networkRowsLoading, setNetworkRowsLoading] = useState(false);

  const [errMsg, setErrMsg] = useState("");
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null);

  const [nodeSearch, setNodeSearch] = useState("");
  const [searchIdx, setSearchIdx] = useState(0);

  const [viewportOnly, setViewportOnly] = useState(true);
  const [currentZoom, setCurrentZoom] = useState(11);
  const boundsRef = useRef<any>(null);
  const [boundsVersion, setBoundsVersion] = useState(0);

  const iconGH = useMemo(() => makePinIcon("G", COLOR_GH, 30), []);
  const iconLBS = useMemo(() => makePinIcon("L", COLOR_LBS, 30), []);
  const iconREC = useMemo(() => makePinIcon("R", COLOR_REC, 30), []);

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

  const nodeCanvasRadius = useMemo(() => {
    const z = currentZoom;
    const r = 3.2 - (z - 10) * 0.18;
    return Math.max(1.8, Math.min(3.2, r));
  }, [currentZoom]);

  const canvasStrokeWeight = useMemo(() => 1.35, []);

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
      const z = Math.max(map.getZoom(), 15);
      map.flyTo([lat, lng] as any, z, { animate: true, duration: 0.35 } as any);
    },
    [map]
  );

  const loadUlpList = useCallback(async () => {
    try {
      setUlpLoading(true);
      setErrMsg("");
      const resp: any = await jsonp(BUNDLE_URL, { mode: "ulplist", up3: UP3 }, 60000);
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

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setErrMsg("");
        setNodesLoading(true);

        const resp: any = await jsonp(BUNDLE_URL, { mode: "nodes", up3: UP3 }, 90000);
        if (!resp?.success) throw new Error(resp?.error || "nodes gagal");

        const arr: NodePointRaw[] = Array.isArray(resp?.nodes)
          ? resp.nodes
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
              )
          : [];

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
      try {
        setErrMsg("");
        setNetworkRowsLoading(true);

        const resp: any = await jsonp(BUNDLE_URL, { mode: "network_rows" }, 90000);
        if (!resp?.success) throw new Error(resp?.error || "network_rows gagal");

        const arr: NetworkRowRaw[] = Array.isArray(resp?.rows)
          ? resp.rows.map((x: any) => ({
              id: String(x?.id || ""),
              rowId: Number(x?.rowId || 0),
              section: String(x?.section || ""),
              segment: String(x?.segment || ""),
              pertemuan: String(x?.pertemuan || ""),
              kms: String(x?.kms || ""),
            }))
          : [];

        if (!cancelled) setNetworkRows(arr);
      } catch (e: any) {
        if (!cancelled) {
          setErrMsg("Gagal load raw PETEMUAN: " + String(e?.message || e));
          setNetworkRows([]);
        }
      } finally {
        if (!cancelled) setNetworkRowsLoading(false);
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
        setErrMsg("");
        setBundleLoading(true);

        const resp: any = await jsonp(BUNDLE_URL, { mode: "bundle", ulp: selectedUlp, up3: UP3 }, 90000);
        if (!resp?.success) throw new Error(resp?.error || "bundle gagal");

        if (!cancelled) {
          setPolesRaw(Array.isArray(resp?.poles) ? resp.poles : []);
        }
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

  const resolvedNetwork = useMemo(() => {
    return resolveLinksFromRows(networkRows, nodesRaw, selectedUlp);
  }, [networkRows, nodesRaw, selectedUlp]);

  const autoLinks = resolvedNetwork.links;
  const unmatchedCount = resolvedNetwork.unmatchedCount;

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

  const nodeGroupsAll = useMemo<NodeGroup[]>(() => {
    const m = new Map<string, NodeGroup>();

    for (const n of nodesRaw) {
      const k = `${n.kategori}|${coordKey(n.latitude, n.longitude)}`;

      if (!m.has(k)) {
        m.set(k, {
          key: k,
          kategori: n.kategori,
          latitude: Number(n.latitude.toFixed(DEDUP_DECIMALS)),
          longitude: Number(n.longitude.toFixed(DEDUP_DECIMALS)),
          items: [n],
        });
      } else {
        m.get(k)!.items.push(n);
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

  const autoLinksDisplayed = useMemo(() => {
    let list = autoLinks;
    const b = viewportOnly ? boundsRef.current : null;

    if (b) {
      list = list.filter(
        (l) =>
          b.contains([l.fromLat, l.fromLng] as any) ||
          b.contains([l.toLat, l.toLng] as any)
      );
    }

    return list;
  }, [autoLinks, viewportOnly, boundsVersion]);

  const stats = useMemo(() => {
    const out = { GH: 0, LBS: 0, REC: 0 };
    nodesRaw.forEach((n) => {
      if (n.kategori === "GH") out.GH++;
      if (n.kategori === "LBS") out.LBS++;
      if (n.kategori === "REC") out.REC++;
    });
    return out;
  }, [nodesRaw]);

  useEffect(() => {
    setSearchIdx(0);
  }, [nodeSearch, nodesRaw.length]);

  const gotoSearchIndex = useCallback(
    (idx: number) => {
      const list = nodeGroupsFiltered;
      if (!list.length) return;

      const i = ((idx % list.length) + list.length) % list.length;
      setSearchIdx(i);

      const item = list[i];
      setSelectedPoint({ kind: "node", data: item });
      focusTo(item.latitude, item.longitude);
    },
    [nodeGroupsFiltered, focusTo]
  );

  const THRESHOLD_DOM_MARKERS = 1500;
  const polesUseCanvas = poleGroupsDisplayed.length > THRESHOLD_DOM_MARKERS;
  const nodesUseCanvas = nodeGroupsDisplayed.length > THRESHOLD_DOM_MARKERS;

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
            width: 330,
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
            <div style={{ marginTop: 8, color: "#666" }}>Klik marker GH / LBS / REC / Tiang.</div>
          ) : selectedPoint.kind === "pole" ? (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontWeight: 800 }}>TIANG</div>
              <div style={{ color: "#666", marginTop: 2 }}>
                {fmtCoord(selectedPoint.data.latitude, selectedPoint.data.longitude)}
              </div>
              <div style={{ marginTop: 6 }}>
                ULP: <b>{selectedPoint.data.ulp || "-"}</b>
              </div>
              <div style={{ marginTop: 4 }}>
                Owner: <b>{selectedPoint.data.owners.join(", ") || "-"}</b>
              </div>
              <div style={{ marginTop: 4 }}>
                Address: <b>{selectedPoint.data.address || "-"}</b>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontWeight: 800, color: colorByKategori(selectedPoint.data.kategori).stroke }}>
                {selectedPoint.data.kategori}
              </div>
              <div style={{ color: "#666", marginTop: 2 }}>
                {fmtCoord(selectedPoint.data.latitude, selectedPoint.data.longitude)}
              </div>

              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                {selectedPoint.data.items.slice(0, 12).map((it, i) => (
                  <div key={i} style={{ padding: "6px 8px", border: "1px solid #eee", borderRadius: 8 }}>
                    <div style={{ fontWeight: 700 }}>{it.keypoint || "-"}</div>
                    <div style={{ fontSize: 12, color: "#444" }}>ULP: {it.ulp || "-"}</div>
                    <div style={{ fontSize: 12, color: "#444" }}>Status: {it.status || "-"}</div>
                  </div>
                ))}
              </div>
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
            width: 370,
            boxShadow: "0px 2px 10px rgba(0,0,0,0.2)",
            fontSize: 12,
            maxHeight: "calc(100vh - 32px)",
            overflowY: "auto",
          }}
        >
          <b>Panel</b>

          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee" }}>
            <div style={{ fontWeight: 800 }}>Search GH / LBS / REC</div>

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input
                value={nodeSearch}
                onChange={(e) => setNodeSearch(e.target.value)}
                placeholder="cari keypoint / kategori / status / ulp"
                style={{
                  flex: 1,
                  padding: 8,
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  outline: "none",
                }}
              />
              <button
                onClick={() => {
                  setNodeSearch("");
                  setSearchIdx(0);
                }}
                style={{
                  padding: "8px 10px",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  background: "white",
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            </div>

            <div style={{ marginTop: 8, color: "#555" }}>
              Hasil: <b>{nodeGroupsFiltered.length}</b>
            </div>

            {nodeSearch.trim() ? (
              <>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    onClick={() => gotoSearchIndex(searchIdx - 1)}
                    disabled={!nodeGroupsFiltered.length}
                    style={{
                      flex: 1,
                      padding: 8,
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      background: "white",
                      cursor: "pointer",
                    }}
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => gotoSearchIndex(searchIdx + 1)}
                    disabled={!nodeGroupsFiltered.length}
                    style={{
                      flex: 1,
                      padding: 8,
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      background: "white",
                      cursor: "pointer",
                    }}
                  >
                    Next
                  </button>
                </div>

                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    maxHeight: 180,
                    overflowY: "auto",
                  }}
                >
                  {nodeGroupsFiltered.slice(0, 12).map((n, i) => (
                    <button
                      key={n.key}
                      onClick={() => {
                        setSearchIdx(i);
                        setSelectedPoint({ kind: "node", data: n });
                        focusTo(n.latitude, n.longitude);
                      }}
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
              </>
            ) : null}
          </div>

          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee" }}>
            <div style={{ fontWeight: 800 }}>Pilih ULP untuk Tiang / Filter Garis</div>

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

            <select
              value={selectedUlp}
              onChange={(e) => setSelectedUlp(e.target.value)}
              style={{ width: "100%", padding: 6, marginTop: 8 }}
            >
              <option value="">-- semua ULP / tiang belum dipilih --</option>
              {ulpList.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>

            <div style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Base Map</div>
              <select
                value={selectedBase}
                onChange={(e) => setSelectedBase(e.target.value as any)}
                style={{ width: "100%", padding: 6 }}
              >
                <option value="normal">Normal</option>
                <option value="satellite">Satellite</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 10, color: "#444" }}>
            Zoom: <b>{currentZoom}</b> • viewportOnly: <b>{viewportOnly ? "ON" : "OFF"}</b>
            <br />
            GH/LBS/REC: <b>{nodesLoading ? "loading..." : "ok"}</b>
            <br />
            Raw PETEMUAN: <b>{networkRowsLoading ? "loading..." : networkRows.length}</b>
            <br />
            Garis PETEMUAN: <b>{networkRowsLoading || nodesLoading ? "loading..." : autoLinks.length}</b>
            <br />
            Unmatched PETEMUAN: <b>{networkRowsLoading || nodesLoading ? "loading..." : unmatchedCount}</b>
            <br />
            GH: <b>{stats.GH}</b> • LBS: <b>{stats.LBS}</b> • REC: <b>{stats.REC}</b>
            <br />
            Tiang: <b>{bundleLoading ? "loading..." : selectedUlp ? poleGroupsDisplayed.length : "belum dipilih"}</b>
            {errMsg ? <div style={{ color: "#d32f2f", marginTop: 6 }}>{errMsg}</div> : null}
          </div>

          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee" }}>
            <div style={{ fontWeight: 800 }}>Anti-lag</div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
              <input type="checkbox" checked={viewportOnly} onChange={(e) => setViewportOnly(e.target.checked)} />
              <span style={{ color: "#555" }}>Render hanya yang terlihat (viewport)</span>
            </label>
          </div>

          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee" }}>
            <div style={{ fontWeight: 800 }}>Screenshot</div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
              <input type="checkbox" checked={ssMode} onChange={(e) => setSsMode(e.target.checked)} />
              <span style={{ color: "#555" }}>Screenshot mode</span>
            </label>
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

        {autoLinksDisplayed.map((l) => (
          <Polyline
            key={l.id}
            positions={[
              [l.fromLat, l.fromLng],
              [l.toLat, l.toLng],
            ] as any}
            pathOptions={{
              color: COLOR_AUTO_LINE,
              weight: 3,
              opacity: 0.9,
            }}
          >
            {!ssMode && (
              <Tooltip sticky direction="top" opacity={1}>
                <div style={{ fontSize: 12, minWidth: 220 }}>
                  <div style={{ fontWeight: 700 }}>
                    {l.fromKategori} {l.fromName} → {l.toKategori} {l.toName}
                  </div>
                  <div style={{ marginTop: 4, color: "#666" }}>Section: {l.section || "-"}</div>
                  <div style={{ color: "#666" }}>Segment: {l.segment || "-"}</div>
                  <div style={{ color: "#666" }}>Pertemuan: {l.pertemuan || "-"}</div>
                  <div style={{ color: "#666" }}>Source: {l.sourceText || "-"}</div>
                  <div style={{ color: "#666" }}>KMS: {l.kms || "-"}</div>
                </div>
              </Tooltip>
            )}
          </Polyline>
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
                    weight: canvasStrokeWeight,
                    fillColor: color.fill,
                    fillOpacity: 0.95,
                  }}
                  eventHandlers={{
                    click: () => {
                      setSelectedPoint({ kind: "node", data: n });
                      focusTo(n.latitude, n.longitude);
                    },
                  }}
                />
              );
            })
          : nodeGroupsDisplayed.map((n) => (
              <Marker
                key={n.key}
                position={[n.latitude, n.longitude]}
                icon={iconByKategori(n.kategori)}
                eventHandlers={{
                  click: () => {
                    setSelectedPoint({ kind: "node", data: n });
                    focusTo(n.latitude, n.longitude);
                  },
                }}
              >
                {!ssMode && (
                  <Tooltip sticky direction="top" opacity={1}>
                    <div style={{ fontSize: 12, minWidth: 220 }}>
                      <div style={{ fontWeight: 700 }}>{n.kategori}</div>
                      <div style={{ marginTop: 4, color: "#666" }}>{fmtCoord(n.latitude, n.longitude)}</div>
                      <div style={{ marginTop: 6 }}>{n.items[0]?.keypoint || "-"}</div>
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
                    weight: canvasStrokeWeight,
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