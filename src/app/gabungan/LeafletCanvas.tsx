"use client";

import { MapContainer, TileLayer, CircleMarker, Tooltip, Polyline, Polygon, useMapEvents, useMap } from "react-leaflet";
import { useEffect, useState, useCallback, useRef } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── Types ──────────────────────────────────────────────────
type FilterType = { semua: boolean; tiang: boolean; LBS: boolean; REC: boolean; GH: boolean; GI: boolean; gardu: boolean };

type PointItem = { id: number; type: string; keypoint: string; latitude: number; longitude: number; penyulang?: string };

type Section = {
    id: number; nama_section: string; penyulang: string;
    panjang_section: number; jumlah_tiang: number; jumlah_gardu: number;
    titik_awal_lat: number; titik_awal_lng: number;
    titik_akhir_lat: number; titik_akhir_lng: number;
    waypoints?: string;
    point_ids?: string;
};

const PENYULANG_OPTIONS = [
    "F.TODDOPPULI", "F.HERTASNING BARU", "F.CHENG HO", "F.GMTDC", "F.ADIYAKSA", "F.PERUMNAS",
    "F.ALAUDDIN", "F.PA'BAENG BAENG", "F.DENPASAR", "F.PENGAYOMAN", "F.LATANETE", "F.VETERAN",
    "F.RAPPOCINI", "F.MONGOSIDI", "F.SALEMBA", "F.IKIP", "F.UNM", "F.KASSI",
    "F.YAPIKA", "F.ASABRI", "F.BARUGA", "F.ANTANG", "F.KODAM", "F.PAROPO", "F.RACING",
    "F.WILAYAH", "F.UIP", "F.DIAMOND", "F.PAM", "F.BOULEVARD", "F.EXPRESS BOULEVARD"
];

// ── Icons ──────────────────────────────────────────────────
const iconGI = L.divIcon({ className: "", html: `<div style="position:relative;width:24px;height:24px;"><div style="position:absolute;width:13px;height:13px;border-radius:50%;background:yellow;border:2px solid black;left:0;top:5px;"></div><div style="position:absolute;width:13px;height:13px;border-radius:50%;background:yellow;border:2px solid black;left:9px;top:5px;"></div></div>`, iconSize: [24, 24], iconAnchor: [12, 12] });
const iconLBS = L.divIcon({ className: "", html: `<div style="width:18px;height:18px;border:2px solid black;background:white;display:flex;align-items:center;justify-content:center;border-radius:2px;"><div style="width:8px;height:8px;border-radius:50%;background:#ef5350;border:1.5px solid black;"></div></div>`, iconSize: [18, 18], iconAnchor: [9, 9] });
const iconREC = L.divIcon({ className: "", html: `<div style="display:flex;gap:2px;align-items:center;height:18px;"><div style="width:3px;height:18px;background:#43a047;border-radius:1px;"></div><div style="width:3px;height:18px;background:#43a047;border-radius:1px;"></div><div style="width:3px;height:18px;background:#43a047;border-radius:1px;"></div></div>`, iconSize: [13, 18], iconAnchor: [6, 9] });
const iconGH = L.divIcon({ className: "", html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"><path d="M2.5 12 H7.5" stroke="#b71c1c" stroke-width="2" stroke-linecap="round"/><rect x="7.5" y="8.3" width="9" height="7.4" rx="0.8" fill="white" stroke="#b71c1c" stroke-width="1.9"/><path d="M16.5 12 H21.5" stroke="#b71c1c" stroke-width="2" stroke-linecap="round"/><path d="M10 10.7 H14" stroke="#b71c1c" stroke-width="1.35" stroke-linecap="round"/><path d="M10 13.3 H14" stroke="#b71c1c" stroke-width="1.35" stroke-linecap="round"/></svg>`, iconSize: [28, 28], iconAnchor: [14, 14] });

// ── Geo helpers ────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildSegmentPolygon(pts: [number, number][], bufferMeters = 10): [number, number][] {
    if (pts.length < 2) return [];
    const half = bufferMeters / 111320;
    const left: [number, number][] = [];
    const right: [number, number][] = [];
    for (let i = 0; i < pts.length - 1; i++) {
        const [la, ln] = pts[i];
        const [lb, lnb] = pts[i + 1];
        const dLat = lb - la, dLng = lnb - ln;
        const len = Math.sqrt(dLat ** 2 + dLng ** 2);
        if (len === 0) continue;
        const perpLat = -dLng / len * half;
        const perpLng = dLat / len * half;
        if (i === 0) {
            left.push([la + perpLat, ln + perpLng]);
            right.push([la - perpLat, ln - perpLng]);
        }
        left.push([lb + perpLat, lnb + perpLng]);
        right.push([lb - perpLat, lnb - perpLng]);
    }
    return [...left, ...[...right].reverse()];
}

function buildSectionPolygon(lat1: number, lng1: number, lat2: number, lng2: number, bufferMeters = 10, waypoints?: string): [number, number][][] {
    const raw = waypoints ? JSON.parse(waypoints) : [[lat1, lng1], [lat2, lng2]];
    // Pecah per segment berdasarkan null separator
    const segments: [number, number][][] = [];
    let current: [number, number][] = [];
    for (const pt of raw) {
        if (pt === null) {
            if (current.length >= 2) segments.push(current);
            current = [];
        } else {
            current.push(pt as [number, number]);
        }
    }
    if (current.length >= 2) segments.push(current);
    if (segments.length === 0) return [];
    // Buat polygon per segment
    return segments.map(seg => buildSegmentPolygon(seg, bufferMeters));
}

function findPathBetween(from: PointItem, to: PointItem, allPoints: PointItem[], maxStepKm = 0.15): PointItem[] {
    const visited = new Set<string>();
    const path: PointItem[] = [];
    let current = from;
    const key = (p: PointItem) => `${p.type}-${p.id}`;
    const dist = (a: PointItem, b: PointItem) => haversineKm(a.latitude, a.longitude, b.latitude, b.longitude);
    visited.add(key(from));

    if (dist(from, to) === 0) return [];

    for (let step = 0; step < allPoints.length; step++) {
        if (key(current) === key(to)) break;

        const dirLat = to.latitude - current.latitude;
        const dirLng = to.longitude - current.longitude;
        const dirLen = Math.sqrt(dirLat ** 2 + dirLng ** 2);

        const candidates = allPoints
            .filter(p => {
                if (visited.has(key(p))) return false;
                if (dist(current, p) > maxStepKm) return false;
                const vecLat = p.latitude - current.latitude;
                const vecLng = p.longitude - current.longitude;
                const vecLen = Math.sqrt(vecLat ** 2 + vecLng ** 2);
                if (vecLen === 0) return false;
                const cosAngle = (dirLat * vecLat + dirLng * vecLng) / (dirLen * vecLen);
                if (cosAngle < -0.5) return false;
                if (dist(p, to) >= dist(current, to)) return false;
                return true;
            })
            .sort((a, b) => dist(a, to) - dist(b, to));

        if (candidates.length === 0) break;
        const next = candidates[0];
        visited.add(key(next));
        path.push(next);
        current = next;
    }
    return path;
}

function MapController({ mapRef }: { mapRef: React.MutableRefObject<any> }) {
    const map = useMap();
    useEffect(() => { mapRef.current = map; }, [map]);
    return null;
}

function ZoomTracker({ onZoom }: { onZoom: (z: number) => void }) {
    const map = useMap();
    useEffect(() => { onZoom(map.getZoom()); }, []);
    useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
    return null;
}

// ── Main ───────────────────────────────────────────────────
export default function LeafletCanvas() {
    const [dataMap, setDataMap] = useState({ tiang: [] as any[], nodes: [] as any[], gardu: [] as any[] });
    const [sections, setSections] = useState<Section[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<PointItem | null>(null);
    const [search, setSearch] = useState("");
    const [satellite, setSatellite] = useState(false);
    const [filterPenyulang, setFilterPenyulang] = useState("SEMUA");
    const [filter, setFilter] = useState<FilterType>({ semua: true, tiang: false, LBS: false, REC: false, GH: false, GI: false, gardu: false });
    const [currentZoom, setCurrentZoom] = useState(13);

    // Edit mode
    const [editMode, setEditMode] = useState(false);
    const [editingSection, setEditingSection] = useState<Section | null>(null);
    const [editingPoints, setEditingPoints] = useState(false);
    const [draftSegments, setDraftSegments] = useState<PointItem[][]>([[]]);
    const [draftPenyulang, setDraftPenyulang] = useState("");
    const [draftPanjang, setDraftPanjang] = useState("");
    const [draftNama, setDraftNama] = useState("");
    const [saving, setSaving] = useState(false);
    const [editorMsg, setEditorMsg] = useState("");
    const [activeSegmentIdx, setActiveSegmentIdx] = useState(0);

    // View
    const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
    const [viewPenyulang, setViewPenyulang] = useState("SEMUA");
    const [showArea, setShowArea] = useState(true);
    const mapRef = useRef<any>(null);
    const draftPoints = draftSegments.flat();

    const tiangRadius = Math.max(1.5, Math.min(5, currentZoom - 11));
    const garduRadius = Math.max(3, Math.min(7, currentZoom - 10));

    // ── Fetch ──────────────────────────────────────────────
    const fetchData = async () => {
        try {
            const res = await fetch("/api/map");
            const data = await res.json();
            setDataMap({ tiang: data?.tiang || [], nodes: data?.nodes || [], gardu: data?.gardu || [] });
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const fetchSections = async () => {
        try {
            const res = await fetch("/api/sections");
            const data = await res.json();
            setSections(data?.sections || []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchData(); fetchSections(); }, []);

    // ── Sections yg ditampilkan ────────────────────────────
    const sectionsDisplayed = sections.filter(s => viewPenyulang === "SEMUA" || s.penyulang === viewPenyulang);

    // ── Titik dalam section aktif (pakai point_ids) ────────
    const selectedSection = sections.find(s => s.id === selectedSectionId);
    const selectedSectionPointIds: { id: number; type: string }[] = selectedSection?.point_ids
        ? JSON.parse(selectedSection.point_ids)
        : [];

    const isInSelectedSection = useCallback((id: number, type: string) => {
        if (!selectedSection) return false;
        return selectedSectionPointIds.some(p => p.id === id && p.type === type);
    }, [selectedSectionPointIds, selectedSection]);

    // ── Filter ─────────────────────────────────────────────
    const matchSearch = (item: any) => {
        if (!search) return true;
        const kw = search.toLowerCase();
        return item.id?.toString().includes(kw) || item.nama_gardu?.toLowerCase()?.includes(kw) || item.kategori?.toLowerCase()?.includes(kw) || item.keypoint?.toLowerCase()?.includes(kw);
    };
    const matchPenyulang = (item: any) => {
        if (filterPenyulang === "SEMUA") return true;
        // Kalau titik masuk section dari penyulang yang dipilih, tetap tampilkan
        if (isInSelectedSection(item.id, item.type || item.kategori)) return true;
        if (!item.penyulang || item.penyulang === "-" || item.penyulang === "null") return false;
        return item.penyulang === filterPenyulang;
    };
    
    const toggleFilter = (key: keyof FilterType) => {
        if (key === "semua") setFilter({ semua: true, tiang: false, LBS: false, REC: false, GH: false, GI: false, gardu: false });
        else setFilter({ semua: false, tiang: key === "tiang", LBS: key === "LBS", REC: key === "REC", GH: key === "GH", GI: key === "GI", gardu: key === "gardu" });
    };

    // ── Edit handlers ──────────────────────────────────────
    const startEditSection = (s: Section) => {
        setEditingSection(s);
        setDraftPenyulang(s.penyulang || "");
        setDraftPanjang(s.panjang_section?.toString() || "");
        setDraftNama(s.nama_section || "");
        setDraftSegments([[]]);
        setActiveSegmentIdx(0);
        setEditingPoints(false);
        setEditMode(true);
        setEditorMsg("Edit mode: ubah data lalu klik Simpan.");
    };

    const startNewSection = () => {
        setEditingSection(null);
        setDraftSegments([[]]);
        setActiveSegmentIdx(0);
        setDraftPenyulang("");
        setDraftPanjang("");
        setDraftNama("");
        setEditingPoints(false);
        setEditMode(true);
        setEditorMsg("Klik titik di peta untuk pilih awal-akhir section.");
    };

    const cancelEdit = () => {
        setEditMode(false);
        setEditingSection(null);
        setEditingPoints(false);
        setDraftSegments([[]]);
        setActiveSegmentIdx(0);
        setDraftPenyulang("");
        setDraftPanjang("");
        setDraftNama("");
        setEditorMsg("");
    };

    const handlePointClick = (point: PointItem) => {
        setSelected(point);
        if (!editMode) return;
        if (editingSection && !editingPoints) return;

        const allPoints: PointItem[] = [
            ...dataMap.tiang.map((t: any) => ({ id: t.id, type: "tiang", keypoint: t.keypoint || "-", latitude: +t.latitude, longitude: +t.longitude, penyulang: t.penyulang })),
            ...dataMap.gardu.map((g: any) => ({ id: g.id, type: "gardu", keypoint: g.nama_gardu || "-", latitude: +g.latitude, longitude: +g.longitude, penyulang: g.penyulang })),
            ...dataMap.nodes.map((n: any) => ({ id: n.id, type: n.kategori, keypoint: n.keypoint || "-", latitude: +n.latitude, longitude: +n.longitude, penyulang: n.penyulang })),
        ];

        const existsInSegment = draftSegments.findIndex(seg =>
            seg.some(p => p.id === point.id && p.type === point.type)
        );

        if (existsInSegment !== -1) {
            // Cek apakah titik ini sudah jadi titik TERAKHIR di segment aktif
            const activeSeg = draftSegments[activeSegmentIdx];
            const lastInActive = activeSeg[activeSeg.length - 1];
            if (lastInActive && lastInActive.id === point.id && lastInActive.type === point.type) {
                setEditorMsg(`Titik ini sudah jadi titik terakhir di jalur aktif.`);
                return;
            }
            // Buat segment baru dimulai dari titik ini
            setDraftSegments(prev => {
                const newSegs = [...prev, [point]];
                setActiveSegmentIdx(newSegs.length - 1);
                return newSegs;
            });
            setEditorMsg(`📍 Cabang baru dari titik #${existsInSegment + 1}. Lanjut klik ke arah baru.`);
            return;
        }

        setDraftSegments(prev => {
            const newSegs = [...prev];
            const activeSeg = newSegs[activeSegmentIdx];

            if (activeSeg.length === 0) {
                newSegs[activeSegmentIdx] = [point];
                setEditorMsg(`📍 Titik awal dipilih. Klik titik berikutnya.`);
            } else {
                const lastPoint = activeSeg[activeSeg.length - 1];
                const path = findPathBetween(lastPoint, point, allPoints);
                const existingKeys = new Set(activeSeg.map(p => `${p.type}-${p.id}`));
                const newPoints = path.filter(p => !existingKeys.has(`${p.type}-${p.id}`));
                newSegs[activeSegmentIdx] = [...activeSeg, ...newPoints];
                const autoCount = newPoints.length - 1;
                if (autoCount > 0) {
                    setEditorMsg(`✅ +${newPoints.length} titik (${autoCount} tiang otomatis).`);
                } else {
                    setEditorMsg(`✅ Titik ditambahkan ke jalur ${activeSegmentIdx + 1}.`);
                }
            }
            return newSegs;
        });
    };

    const isDraft = (id: number, type: string) => draftSegments.flat().some(p => p.id === id && p.type === type);

    const saveSection = async () => {
        if (!editingSection && draftPoints.length < 3) { setEditorMsg("Pilih minimal 3 titik untuk menentukan alur!"); return; }
        if (!draftPenyulang) { setEditorMsg("Pilih penyulang dulu!"); return; }
        setSaving(true);
        try {
            if (editingSection) {
                const res = await fetch("/api/sections", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: editingSection.id,
                        nama_section: draftNama || editingSection.nama_section,
                        penyulang: draftPenyulang,
                        panjang_section: parseFloat(draftPanjang) || editingSection.panjang_section,
                        points: editingPoints && draftPoints.length >= 2 ? draftPoints : undefined,
                        segments: editingPoints && draftSegments.filter(s => s.length >= 2).length > 0
                            ? draftSegments.filter(s => s.length >= 2)
                            : undefined,
                    }),
                });
                const data = await res.json();
                if (data.success) { setEditorMsg("Section berhasil diupdate!"); fetchSections(); cancelEdit(); }
                else setEditorMsg("Gagal update: " + (data.error || ""));
            } else {
                let panjang = parseFloat(draftPanjang) || 0;
                if (!panjang) {
                    for (let i = 0; i < draftPoints.length - 1; i++)
                        panjang += haversineKm(draftPoints[i].latitude, draftPoints[i].longitude, draftPoints[i + 1].latitude, draftPoints[i + 1].longitude);
                    panjang = Math.round(panjang * 1000) / 1000;
                }
                const segmentsToSend = draftSegments.filter(seg => seg.length >= 2);
                const res = await fetch("/api/sections", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nama_section: draftNama.trim() || undefined, penyulang: draftPenyulang, panjang_section: panjang, points: draftPoints, segments: segmentsToSend }),
                });
                const data = await res.json();
                if (data.success) { setEditorMsg("Section berhasil disimpan!"); fetchSections(); cancelEdit(); }
                else setEditorMsg("Gagal simpan: " + (data.error || "unknown error"));
            }
        } catch (e) { setEditorMsg("Error: " + String(e)); }
        finally { setSaving(false); }
    };

    const deleteSection = async (id: number) => {
        if (!window.confirm("Hapus section ini?")) return;
        try {
            const res = await fetch("/api/sections", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
            const data = await res.json();
            if (data.success) { fetchSections(); setSelectedSectionId(null); setEditorMsg("Section dihapus!"); }
        } catch (e) { alert("Gagal hapus"); }
    };

    if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontSize: 18 }}>⏳ Loading data...</div>;

    const activeSec = sections.find(s => s.id === selectedSectionId);
    const activePolygon = activeSec ? buildSectionPolygon(activeSec.titik_awal_lat, activeSec.titik_awal_lng, activeSec.titik_akhir_lat, activeSec.titik_akhir_lng, 10, activeSec.waypoints) : null;

    return (
        <div style={{ position: "relative", height: "100vh" }}>

            {/* ── PANEL KANAN ── */}
            <div style={{ position: "absolute", top: 10, right: 10, zIndex: 1000, background: "white", padding: 12, borderRadius: 10, width: 250, boxShadow: "0 2px 10px rgba(0,0,0,0.2)", fontSize: 12, maxHeight: "calc(100vh - 20px)", overflowY: "auto" }}>
                <b style={{ fontSize: 13 }}>🗺 Panel Map</b>

                <div style={{ marginTop: 10 }}>
                    <b>Cari</b>
                    <input type="text" placeholder="ID / keypoint..." value={search}
                        onChange={e => {
                            setSearch(e.target.value);
                            if (!e.target.value || !mapRef.current) return;
                            const kw = e.target.value.toLowerCase();
                            const t = dataMap.tiang.find((x: any) => x.id?.toString() === kw || x.keypoint?.toLowerCase()?.includes(kw));
                            if (t) { mapRef.current.flyTo([+t.latitude, +t.longitude], 17, { duration: 1 }); return; }
                            const g = dataMap.gardu.find((x: any) => x.id?.toString() === kw || x.nama_gardu?.toLowerCase()?.includes(kw));
                            if (g) { mapRef.current.flyTo([+g.latitude, +g.longitude], 17, { duration: 1 }); return; }
                            const n = dataMap.nodes.find((x: any) => x.id?.toString() === kw || x.keypoint?.toLowerCase()?.includes(kw));
                            if (n) { mapRef.current.flyTo([+n.latitude, +n.longitude], 17, { duration: 1 }); return; }
                        }}
                        style={{ width: "100%", padding: "4px 6px", marginTop: 4, border: "1px solid #ddd", borderRadius: 6 }}
                    />
                </div>

                <div style={{ marginTop: 10 }}>
                    <button onClick={() => setSatellite(!satellite)} style={{ width: "100%", padding: "6px 0", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", background: satellite ? "#e3f2fd" : "white" }}>
                        {satellite ? "🛰 Satelit" : "🗺 Normal"}
                    </button>
                </div>

                <div style={{ marginTop: 10 }}>
                    <b>Filter Penyulang</b>
                    <select value={filterPenyulang} onChange={e => setFilterPenyulang(e.target.value)} style={{ width: "100%", marginTop: 4, padding: "4px 6px", border: "1px solid #ddd", borderRadius: 6 }}>
                        <option value="SEMUA">SEMUA</option>
                        {PENYULANG_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>

                <div style={{ marginTop: 10 }}>
                    <b>Filter Tampil</b>
                    <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {(Object.keys(filter) as (keyof FilterType)[]).map(key => (
                            <button key={key} onClick={() => toggleFilter(key)} style={{ padding: "3px 8px", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", background: filter[key] ? "#1565c0" : "white", color: filter[key] ? "white" : "black", fontSize: 11 }}>
                                {key}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <b>Sections</b>
                        <label style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 11, cursor: "pointer" }}>
                            <input type="checkbox" checked={showArea} onChange={e => setShowArea(e.target.checked)} />
                            Area 10m
                        </label>
                    </div>
                    <div style={{ marginTop: 6 }}>
                        <b style={{ fontSize: 11 }}>Lihat per penyulang:</b>
                        <select value={viewPenyulang} onChange={e => setViewPenyulang(e.target.value)} style={{ width: "100%", marginTop: 4, padding: "4px 6px", border: "1px solid #ddd", borderRadius: 6, fontSize: 11 }}>
                            <option value="SEMUA">SEMUA</option>
                            {PENYULANG_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5, maxHeight: 220, overflowY: "auto" }}>
                        {sectionsDisplayed.length === 0
                            ? <div style={{ color: "#888", fontSize: 11 }}>Belum ada section.</div>
                            : sectionsDisplayed.map(s => (
                                <div key={s.id} style={{ border: selectedSectionId === s.id ? "1px solid #1565c0" : "1px solid #eee", borderRadius: 8, background: selectedSectionId === s.id ? "#e3f2fd" : "white" }}>
                                    <button onClick={() => {
                                        const newId = selectedSectionId === s.id ? null : s.id;
                                        setSelectedSectionId(newId);
                                        if (newId && mapRef.current) {
                                            const wp = s.waypoints ? JSON.parse(s.waypoints).filter((c: any) => c !== null) : [[s.titik_awal_lat, s.titik_awal_lng], [s.titik_akhir_lat, s.titik_akhir_lng]];
                                            const lats = wp.map((c: number[]) => c[0]);
                                            const lngs = wp.map((c: number[]) => c[1]);
                                            const bounds = [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]];
                                            mapRef.current.fitBounds(bounds, { padding: [60, 60] });
                                        }
                                    }} style={{ width: "100%", textAlign: "left", padding: "7px 9px", background: "transparent", border: "none", cursor: "pointer" }}>
                                        <div style={{ fontWeight: 700, fontSize: 11 }}>{s.nama_section || "-"}</div>
                                        <div style={{ color: "#666", fontSize: 10, marginTop: 2 }}>{s.penyulang || "-"} • {s.panjang_section ? `${s.panjang_section} km` : "-"}</div>
                                        <div style={{ color: "#888", fontSize: 10 }}>Tiang: {s.jumlah_tiang} • Gardu: {s.jumlah_gardu}</div>
                                    </button>
                                    {selectedSectionId === s.id && (
                                        <div style={{ display: "flex", gap: 5, padding: "0 8px 8px" }}>
                                            <button onClick={() => startEditSection(s)} style={{ flex: 1, padding: "4px 0", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", fontSize: 10, background: "white" }}>✏️ Edit</button>
                                            <button onClick={() => deleteSection(s.id)} style={{ flex: 1, padding: "4px 0", border: "1px solid #f0c0c0", borderRadius: 6, cursor: "pointer", fontSize: 10, background: "#fff5f5", color: "#c62828" }}>🗑 Hapus</button>
                                        </div>
                                    )}
                                </div>
                            ))
                        }
                    </div>
                    <button onClick={startNewSection} style={{ marginTop: 8, width: "100%", padding: "7px 0", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", background: "#e8f5e9", fontWeight: 700, fontSize: 11 }}>
                        ➕ Tambah Section Baru
                    </button>
                </div>

                <div style={{ marginTop: 10, color: "#666", fontSize: 10, borderTop: "1px solid #eee", paddingTop: 8 }}>
                    Tiang: {dataMap.tiang.length} • Gardu: {dataMap.gardu.length} • Nodes: {dataMap.nodes.length}
                </div>
            </div>

            {/* ── PANEL KIRI - INFO ── */}
            <div style={{ position: "absolute", top: 10, left: 10, zIndex: 1000, background: "white", padding: 10, borderRadius: 8, boxShadow: "0 2px 10px rgba(0,0,0,0.2)", fontSize: 12, minWidth: 160, maxWidth: 200 }}>
                {selected ? (
                    <>
                        <b>Detail</b>
                        <div style={{ marginTop: 6 }}>Tipe: <b>{selected.type}</b></div>
                        <div>Keypoint: <b>{selected.keypoint || "-"}</b></div>
                        <div>Penyulang: <b>{selected.penyulang && selected.penyulang !== "-" ? selected.penyulang : "Belum diset"}</b></div>
                        <div>Lat: {Number(selected.latitude).toFixed(6)}</div>
                        <div>Lng: {Number(selected.longitude).toFixed(6)}</div>
                        {selectedSection && (
                            <div style={{ marginTop: 6, fontWeight: 700, color: isInSelectedSection(selected.id, selected.type) ? "#2e7d32" : "#888" }}>
                                {isInSelectedSection(selected.id, selected.type) ? "✅ Dalam section" : "❌ Di luar section"}
                            </div>
                        )}
                        {editMode && (!editingSection || editingPoints) && (
                            <div style={{ marginTop: 4, color: isDraft(selected.id, selected.type) ? "#1565c0" : "#888", fontWeight: 700, fontSize: 11 }}>
                                {isDraft(selected.id, selected.type) ? "✅ Dipilih untuk section" : "Klik untuk pilih"}
                            </div>
                        )}
                    </>
                ) : (
                    <div style={{ color: "#888" }}>Klik titik untuk detail</div>
                )}
            </div>

            {/* ── PANEL EDITOR - BAWAH KIRI ── */}
            {editMode && (
                <div style={{ position: "absolute", bottom: 16, left: 10, zIndex: 1100, background: "white", padding: 14, borderRadius: 12, width: 320, boxShadow: "0 6px 20px rgba(0,0,0,0.22)", fontSize: 12 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{editingSection ? "✏️ Edit Section" : "➕ Tambah Section"}</div>

                    {editorMsg && (
                        <div style={{ marginTop: 8, padding: "6px 8px", borderRadius: 6, background: editorMsg.includes("berhasil") ? "#e8f5e9" : "#fff8e1", color: editorMsg.includes("berhasil") ? "#2e7d32" : "#e65100", fontSize: 11 }}>
                            {editorMsg}
                        </div>
                    )}

                    {editingSection ? (
                        // Mode edit existing
                        <div style={{ marginTop: 10 }}>
                            <div style={{ marginBottom: 4 }}>Nama Section</div>
                            <input value={draftNama} onChange={e => setDraftNama(e.target.value)} style={{ width: "100%", padding: "6px 8px", border: "1px solid #ddd", borderRadius: 6 }} />
                            <div style={{ marginTop: 8, marginBottom: 4 }}>Penyulang</div>
                            <select value={draftPenyulang} onChange={e => setDraftPenyulang(e.target.value)} style={{ width: "100%", padding: "6px 8px", border: "1px solid #ddd", borderRadius: 6 }}>
                                <option value="">-- pilih penyulang --</option>
                                {PENYULANG_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                            <div style={{ marginTop: 8, marginBottom: 4 }}>Panjang (km)</div>
                            <input type="number" step="0.001" value={draftPanjang} onChange={e => setDraftPanjang(e.target.value)} style={{ width: "100%", padding: "6px 8px", border: "1px solid #ddd", borderRadius: 6 }} />

                            <button
                                onClick={() => {
                                    if (editingPoints) {
                                        setEditingPoints(false);
                                        setDraftSegments([[]]);
                                        setActiveSegmentIdx(0);
                                        setEditorMsg("Edit titik dibatalkan.");
                                    } else {
                                        // Muat titik yang sudah tersimpan ke draftSegments
                                        if (editingSection?.point_ids) {
                                            const savedIds: { id: number; type: string }[] = JSON.parse(editingSection.point_ids);
                                            const allPts: PointItem[] = [
                                                ...dataMap.tiang.map((t: any) => ({ id: t.id, type: "tiang", keypoint: t.keypoint || "-", latitude: +t.latitude, longitude: +t.longitude, penyulang: t.penyulang })),
                                                ...dataMap.gardu.map((g: any) => ({ id: g.id, type: "gardu", keypoint: g.nama_gardu || "-", latitude: +g.latitude, longitude: +g.longitude, penyulang: g.penyulang })),
                                                ...dataMap.nodes.map((n: any) => ({ id: n.id, type: n.kategori, keypoint: n.keypoint || "-", latitude: +n.latitude, longitude: +n.longitude, penyulang: n.penyulang })),
                                            ];
                                            // Cocokkan id+type dari point_ids ke data lengkap
                                            const loaded: PointItem[] = savedIds
                                                .map(s => allPts.find(p => p.id === s.id && p.type === s.type))
                                                .filter(Boolean) as PointItem[];
                                            setDraftSegments(loaded.length > 0 ? [loaded] : [[]]);
                                        } else {
                                            setDraftSegments([[]]);
                                        }
                                        setActiveSegmentIdx(0);
                                        setEditingPoints(true);
                                        setEditorMsg("Titik tersimpan dimuat. Klik titik untuk tambah/hapus.");
                                    }
                                }}
                                style={{ marginTop: 10, width: "100%", padding: "6px 0", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", background: editingPoints ? "#fff3e0" : "#f5f5f5", fontWeight: 700, fontSize: 11 }}>
                                {editingPoints ? "🟠 Sedang Edit Titik — Klik untuk Batal" : "🗺 Edit Titik / Jalur"}
                            </button>

                            {editingPoints && (
                                <div style={{ marginTop: 8 }}>
                                    <div style={{ fontWeight: 700, fontSize: 11 }}>Titik Baru ({draftPoints.length})</div>
                                    <div style={{ marginTop: 4, maxHeight: 80, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
                                        {draftSegments.map((seg, si) => (
                                            <div key={`seg-${si}`}>
                                                {draftSegments.length > 1 && <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>Jalur {si + 1}</div>}
                                                {seg.map((p, i) => (
                                                    <div key={`${p.type}-${p.id}-${si}-${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px", border: activeSegmentIdx === si ? "1px solid #fb8c00" : "1px solid #eee", borderRadius: 6, marginTop: 3 }}>
                                                        <div><b>#{i + 1}</b> {p.type} — {p.keypoint || p.id}</div>
                                                        <button onClick={() => setDraftSegments(prev => prev.map((s, idx) => idx === si ? s.filter((_, pi) => pi !== i) : s))} style={{ padding: "2px 6px", border: "1px solid #ddd", borderRadius: 4, cursor: "pointer", fontSize: 10 }}>✕</button>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Mode tambah baru
                        <>
                            <div style={{ marginTop: 10 }}>
                                <div style={{ marginBottom: 4 }}>Nama Section</div>
                                <input
                                    value={draftNama}
                                    onChange={e => setDraftNama(e.target.value)}
                                    placeholder="contoh: LBS Toddopuli - Gardu Villa"
                                    style={{ width: "100%", padding: "6px 8px", border: "1px solid #ddd", borderRadius: 6 }}
                                />
                            </div>
                            <div style={{ marginTop: 10 }}>
                                <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                                    Titik Dipilih ({draftPoints.length})
                                    {draftPoints.length >= 2 && (
                                        <span style={{ fontWeight: 400, color: "#43a047", fontSize: 10 }}>✅ garis terhubung otomatis</span>
                                    )}
                                </div>
                                <div style={{ marginTop: 4, maxHeight: 120, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
                                    {draftPoints.length === 0
                                        ? <div style={{ color: "#888", fontSize: 11 }}>Klik min. 3 titik di peta untuk menentukan alur.</div>
                                        : draftSegments.map((seg, si) => (
                                            <div key={`seg-${si}`}>
                                                {draftSegments.length > 1 && (
                                                    <div style={{ fontSize: 10, color: "#888", marginTop: 4, fontWeight: 700 }}>
                                                        🔀 Cabang {si + 1} {activeSegmentIdx === si ? "— aktif" : ""}
                                                    </div>
                                                )}
                                                {seg.map((p, i) => (
                                                    <div key={`${p.type}-${p.id}-${si}-${i}`}
                                                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px", border: activeSegmentIdx === si ? "1px solid #fb8c00" : "1px solid #eee", borderRadius: 6, marginTop: 3 }}>
                                                        <div>
                                                            <span style={{ color: "#fb8c00", fontWeight: 700 }}>#{i + 1}</span> {p.type} — {p.keypoint || p.id}
                                                        </div>
                                                        <button
                                                            onClick={() => setDraftSegments(prev => prev.map((s, idx) =>
                                                                idx === si ? s.filter((_, pi) => pi !== i) : s
                                                            ))}
                                                            style={{ padding: "2px 6px", border: "1px solid #ddd", borderRadius: 4, cursor: "pointer", fontSize: 10 }}>
                                                            ✕
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ))
                                    }
                                </div>
                                {draftPoints.length > 0 && draftPoints.length < 3 && (
                                    <div style={{ marginTop: 4, fontSize: 10, color: "#e65100" }}>
                                        ⚠️ Butuh {3 - draftPoints.length} titik lagi sebelum bisa simpan.
                                    </div>
                                )}
                            </div>
                            <div style={{ marginTop: 8 }}>
                                <div style={{ marginBottom: 4 }}>Penyulang</div>
                                <select value={draftPenyulang} onChange={e => setDraftPenyulang(e.target.value)} style={{ width: "100%", padding: "6px 8px", border: "1px solid #ddd", borderRadius: 6 }}>
                                    <option value="">-- pilih penyulang --</option>
                                    {PENYULANG_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div style={{ marginTop: 8 }}>
                                <div style={{ marginBottom: 4 }}>Panjang (km) <span style={{ color: "#888" }}>— kosong = otomatis</span></div>
                                <input type="number" step="0.001" value={draftPanjang} onChange={e => setDraftPanjang(e.target.value)} placeholder="contoh: 1.250" style={{ width: "100%", padding: "6px 8px", border: "1px solid #ddd", borderRadius: 6 }} />
                            </div>
                        </>
                    )}

                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button onClick={saveSection} disabled={saving} style={{ flex: 2, padding: "8px 0", border: "1px solid #ddd", borderRadius: 8, background: "#e3f2fd", cursor: "pointer", fontWeight: 700 }}>
                            {saving ? "Menyimpan..." : "💾 Simpan"}
                        </button>
                        <button
                            onClick={() => {
                                setDraftSegments(prev => {
                                    const newSegs = [...prev];
                                    if (newSegs[activeSegmentIdx].length > 0) {
                                        newSegs[activeSegmentIdx] = newSegs[activeSegmentIdx].slice(0, -1);
                                    } else if (activeSegmentIdx > 0) {
                                        newSegs.splice(activeSegmentIdx, 1);
                                        setActiveSegmentIdx(activeSegmentIdx - 1);
                                    }
                                    return newSegs;
                                });
                            }}
                            disabled={draftPoints.length === 0}
                            style={{ flex: 1, padding: "8px 0", border: "1px solid #ddd", borderRadius: 8, background: "#fff8e1", cursor: "pointer", fontSize: 11 }}>
                            ↩ Undo
                        </button>
                        <button onClick={cancelEdit} style={{ flex: 1, padding: "8px 0", border: "1px solid #ddd", borderRadius: 8, background: "white", cursor: "pointer" }}>
                            Batal
                        </button>
                    </div>
                </div>
            )}

            {/* ── MAP ── */}
            <MapContainer center={[-5.15, 119.43]} zoom={13} preferCanvas style={{ height: "100vh" }}>
                <ZoomTracker onZoom={setCurrentZoom} />
                <MapController mapRef={mapRef} />
                <TileLayer url={satellite ? "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} maxZoom={20} />

                {/* Sections — garis + area polygon */}
                {sectionsDisplayed.map(s => {
                    const isSelected = selectedSectionId === s.id;
                    const polys = buildSectionPolygon(s.titik_awal_lat, s.titik_awal_lng, s.titik_akhir_lat, s.titik_akhir_lng, 10, s.waypoints);
                    return (
                        <div key={`sec-${s.id}`}>
                            {showArea && polys.map((poly, pi) => poly.length > 0 && (
                                <Polygon key={`poly-${s.id}-${pi}`} positions={poly} pathOptions={{ color: isSelected ? "#1e88e5" : "#e53935", fillColor: isSelected ? "#1e88e5" : "#e53935", fillOpacity: isSelected ? 0.18 : 0.08, weight: 0 }}>
                                    <Tooltip sticky>{s.nama_section || "-"} — Area 10m</Tooltip>
                                </Polygon>
                            ))}
                            {(() => {
                                let segments: [number, number][][];
                                if (!s.waypoints) {
                                    segments = [];
                                } else {
                                    try {
                                        const raw: ([number, number] | null)[] = JSON.parse(s.waypoints);
                                        const segs: [number, number][][] = [];
                                        let current: [number, number][] = [];
                                        raw.forEach(pt => {
                                            if (pt === null) { if (current.length >= 2) segs.push(current); current = []; }
                                            else current.push(pt);
                                        });
                                        if (current.length >= 2) segs.push(current);
                                        segments = segs;
                                    } catch { segments = []; }
                                }
                                return segments.filter(seg => {
                                    // Skip segment yang terlalu panjang (kemungkinan data lama yang salah)
                                    if (seg.length < 2) return false;
                                    const first = seg[0], last = seg[seg.length - 1];
                                    const dist = haversineKm(first[0], first[1], last[0], last[1]);
                                    return dist < 3; // max 3km per segment
                                }).map((seg, si) => (
                                    <Polyline key={`line-${s.id}-${si}`} positions={seg}
                                        pathOptions={{ color: isSelected ? "#1e88e5" : "#e53935", weight: isSelected ? 5 : 3, opacity: 0.9 }}>
                                        <Tooltip sticky>{s.nama_section || "-"}<br />{s.penyulang || "-"} • {s.panjang_section ? `${s.panjang_section} km` : "-"}</Tooltip>
                                    </Polyline>
                                ));
                            })()}
                        </div>
                    );
                })}

                {/* Draft garis — auto konek urut per segment */}
                {editMode && (!editingSection || editingPoints) && draftSegments.map((seg, i) =>
                    seg.length >= 2 ? (
                        <Polyline
                            key={`draft-seg-${i}`}
                            positions={seg.map(p => [p.latitude, p.longitude] as [number, number])}
                            pathOptions={{
                                color: i === activeSegmentIdx ? "#fb8c00" : "#ff7043",
                                weight: i === activeSegmentIdx ? 4.5 : 2.5,
                                opacity: 0.95,
                                dashArray: "9 5"
                            }}>
                            <Tooltip sticky>Jalur {i + 1} — {seg.length} titik</Tooltip>
                        </Polyline>
                    ) : null
                )}

                {/* TIANG */}
                {(filter.semua || filter.tiang) && dataMap.tiang.filter(t => matchSearch(t) && matchPenyulang(t)).map((t: any) => {
                    const inDraft = isDraft(t.id, "tiang");
                    const inArea = isInSelectedSection(t.id, "tiang");
                    return (
                        <CircleMarker key={`tiang-${t.id}`} center={[+t.latitude, +t.longitude]}
                            radius={inDraft ? tiangRadius + 3 : inArea ? tiangRadius + 1 : tiangRadius}
                            pathOptions={{ color: inDraft ? "#fb8c00" : inArea ? "#2e7d32" : "black", fillColor: inDraft ? "#fb8c00" : inArea ? "#66bb6a" : "black", fillOpacity: 1, weight: inDraft ? 2 : inArea ? 1.5 : 1 }}
                            eventHandlers={{ click: () => handlePointClick({ id: t.id, type: "tiang", keypoint: t.keypoint || "-", latitude: +t.latitude, longitude: +t.longitude, penyulang: t.penyulang }) }}>
                            <Tooltip>Tiang #{t.id}{inArea ? " ✅" : ""}</Tooltip>
                        </CircleMarker>
                    );
                })}

                {/* GARDU */}
                {(filter.semua || filter.gardu) && dataMap.gardu.filter(g => matchSearch(g) && matchPenyulang(g)).map((g: any) => {
                    const inDraft = isDraft(g.id, "gardu");
                    const inArea = isInSelectedSection(g.id, "gardu");
                    return (
                        <CircleMarker key={`gardu-${g.id}`} center={[+g.latitude, +g.longitude]}
                            radius={inDraft ? garduRadius + 3 : inArea ? garduRadius + 1 : garduRadius}
                            pathOptions={{ color: inDraft ? "#fb8c00" : inArea ? "#1565c0" : "darkblue", fillColor: inDraft ? "#fb8c00" : inArea ? "#42a5f5" : "lightblue", fillOpacity: 1, weight: inDraft ? 2 : inArea ? 2 : 1 }}
                            eventHandlers={{ click: () => handlePointClick({ id: g.id, type: "gardu", keypoint: g.nama_gardu || "-", latitude: +g.latitude, longitude: +g.longitude, penyulang: g.penyulang }) }}>
                            <Tooltip>Gardu - {g.nama_gardu || "-"}{inArea ? " ✅" : ""}</Tooltip>
                        </CircleMarker>
                    );
                })}

                {/* GI */}
                {(filter.semua || filter.GI) && dataMap.nodes.filter((n: any) => n.kategori === "GI").filter(n => matchSearch(n) && matchPenyulang(n)).map((n: any) => (
                    <Marker key={`gi-${n.id}`} position={[+n.latitude, +n.longitude]} icon={iconGI}
                        eventHandlers={{ click: () => handlePointClick({ id: n.id, type: "GI", keypoint: n.keypoint || "-", latitude: +n.latitude, longitude: +n.longitude, penyulang: n.penyulang }) }}>
                        <Tooltip>GI - {n.keypoint || "-"}</Tooltip>
                    </Marker>
                ))}

                {/* NODES (GH, LBS, REC) */}
                {dataMap.nodes.filter(n => matchSearch(n) && matchPenyulang(n)).map((n: any) => {
                    if (n.kategori === "GI") return null;
                    const visible = filter.semua || filter[n.kategori as keyof FilterType];
                    if (!visible) return null;
                    const inDraft = isDraft(n.id, n.kategori);
                    const inArea = isInSelectedSection(n.id, n.kategori);

                    if (inDraft) return (
                        <CircleMarker key={`node-draft-${n.id}`} center={[+n.latitude, +n.longitude]} radius={8}
                            pathOptions={{ color: "#fb8c00", fillColor: "#fb8c00", fillOpacity: 0.9, weight: 2 }}
                            eventHandlers={{ click: () => handlePointClick({ id: n.id, type: n.kategori, keypoint: n.keypoint || "-", latitude: +n.latitude, longitude: +n.longitude, penyulang: n.penyulang }) }}>
                            <Tooltip>{n.kategori} - {n.keypoint || "-"}</Tooltip>
                        </CircleMarker>
                    );

                    let icon = iconLBS;
                    if (n.kategori === "REC") icon = iconREC;
                    if (n.kategori === "GH") icon = iconGH;

                    return (
                        <Marker key={`node-${n.id}`} position={[+n.latitude, +n.longitude]} icon={icon}
                            eventHandlers={{ click: () => handlePointClick({ id: n.id, type: n.kategori, keypoint: n.keypoint || "-", latitude: +n.latitude, longitude: +n.longitude, penyulang: n.penyulang }) }}>
                            <Tooltip>{n.kategori} - {n.keypoint || "-"}{inArea ? " ✅" : ""}</Tooltip>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}