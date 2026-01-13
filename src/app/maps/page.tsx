'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Trash2, Plus, Ruler, Loader2, ChevronLeft, ChevronRight, Edit2, Save, X } from 'lucide-react';
import type L from 'leaflet';

interface Titik {
  id: number;
  lat: number;
  lng: number;
  name: string;
  kapasitas: string;
  iconType: 'trafo' | 'dot';
}

interface UserLocation {
  lat: number;
  lng: number;
}

interface EditingTitik {
  id: number;
  name: string;
  lat: string;
  lng: string;
  kapasitas: string;
  iconType: 'trafo' | 'dot';
}

const Maps = () => {
  const [map, setMap] = useState<L.Map | null>(null);
  const [L, setL] = useState<typeof import('leaflet') | null>(null);
  const [titiks, setTitiks] = useState<Titik[]>([]);
  const [selectedTitiks, setSelectedTitiks] = useState<number[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [baseMap, setBaseMap] = useState<'street' | 'satellite'>('street');
  const [showSatelliteToggle, setShowSatelliteToggle] = useState(true);
  const [showZoomWarning, setShowZoomWarning] = useState(false);

  const [inputCoordinates, setInputCoordinates] = useState('');
  const [inputName, setInputName] = useState('');
  const [inputKapasitas, setInputKapasitas] = useState('');
  const [inputIconType, setInputIconType] = useState<'trafo' | 'dot'>('dot');
  const [routeType, setRouteType] = useState<'straight' | 'route'>('straight');
  const [cableSlackPercent] = useState<number>(3);
  const [distance, setDistance] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editingTitik, setEditingTitik] = useState<EditingTitik | null>(null);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<{ [key: number]: L.Marker }>({});
  const linesRef = useRef<L.Polyline[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const layersRef = useRef<{ street: L.TileLayer | null; satellite: L.TileLayer | null }>({ street: null, satellite: null });

  useEffect(() => {
    let mounted = true;

    const loadLeaflet = async () => {
      if (typeof window === 'undefined') return;

      const leaflet = await import('leaflet');
      if (!mounted) return;

      setL(leaflet);

      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
    };

    loadLeaflet();

    return () => {
      mounted = false;
    };
  }, []);

  // Get user location
  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser');
      setUserLocation({ lat: 1.4748, lng: 124.8421 });
      setIsLoadingLocation(false);
      return;
    }

    // Try with high accuracy first, fallback if timeout
    const tryGetLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(loc);
          setIsLoadingLocation(false);
        },
        (error: GeolocationPositionError) => {
          // If high accuracy times out, try with lower accuracy
          if (error.code === error.TIMEOUT) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const loc = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
                };
                setUserLocation(loc);
                setIsLoadingLocation(false);
              },
              () => {
                // Final fallback to default location
                setUserLocation({ lat: 1.4748, lng: 124.8421 });
                setIsLoadingLocation(false);
              },
              {
                enableHighAccuracy: false,
                timeout: 5000,
                maximumAge: 60000
              }
            );
          } else {
            // Use default location for other errors
            setUserLocation({ lat: 1.4748, lng: 124.8421 });
            setIsLoadingLocation(false);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    };

    tryGetLocation();

    // Watch position with more lenient settings
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLoc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(newLoc);
        
        if (userMarkerRef.current && L) {
          userMarkerRef.current.setLatLng([newLoc.lat, newLoc.lng]);
        }
      },
      () => {
        // Silently ignore watch errors to avoid console spam
      },
      {
        enableHighAccuracy: false,
        maximumAge: 30000,
        timeout: 15000
      }
    );

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [L]);

  // Initialize map
  useEffect(() => {
    if (L && userLocation && !map && mapRef.current) {
      const mapInstance = L.map(mapRef.current, {
        zoomControl: false,
        maxBounds: [[-90, -180], [90, 180]],
        maxBoundsViscosity: 0.5
      }).setView([userLocation.lat, userLocation.lng], 16);

      L.control.zoom({ position: 'topleft' }).addTo(mapInstance);

      mapInstance.on('zoomend', () => {
        const zoom = mapInstance.getZoom();
        setShowZoomWarning(zoom >= 18);
      });

      const streetLayer = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
          minZoom: 3,
          bounds: [[-90, -180], [90, 180]],
        }
      );

      const satelliteLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles © Esri',
          maxZoom: 19,
          minZoom: 3,
          bounds: [[-90, -180], [90, 180]],
        }
      );

      streetLayer.addTo(mapInstance);
      layersRef.current = { street: streetLayer, satellite: satelliteLayer };

      streetLayer.on('tileerror', function(event: L.TileErrorEvent) {
        const img = event.tile as HTMLImageElement & { retried?: boolean };
        if (!img.retried) {
          img.retried = true;
          setTimeout(() => { img.src = img.src; }, 1000);
        }
      });

      satelliteLayer.on('tileerror', function(event: L.TileErrorEvent) {
        const img = event.tile as HTMLImageElement & { retried?: boolean };
        if (!img.retried) {
          img.retried = true;
          setTimeout(() => { img.src = img.src; }, 1000);
        }
      });

      const userMarker = L.marker([userLocation.lat, userLocation.lng], {
        icon: L.divIcon({
          className: 'user-location-marker',
          html: `
            <div style="position: relative;">
              <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(59, 130, 246, 0.2); width: 40px; height: 40px; border-radius: 50%; animation: pulse 2s infinite;"></div>
              <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>
            </div>
            <style>
              @keyframes pulse {
                0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
              }
            </style>
          `,
          iconSize: [40, 40]
        })
      }).addTo(mapInstance);
      
      userMarker.bindPopup('<b>Lokasi Anda</b>');
      userMarkerRef.current = userMarker;

      mapInstance.on('click', (e: L.LeafletMouseEvent) => {
        const newTitik: Titik = {
          id: Date.now(),
          lat: e.latlng.lat,
          lng: e.latlng.lng,
          name: `Titik ${titiks.length + 1}`,
          kapasitas: '',
          iconType: 'dot'
        };
        addTitikToMap(newTitik, mapInstance);
      });

      setMap(mapInstance);
    }
  }, [L, userLocation, map, titiks.length]);

  const toggleBaseMap = () => {
    if (!map) return;
    
    const layers = layersRef.current;
    if (!layers.street || !layers.satellite) return;
    
    if (baseMap === 'street') {
      map.removeLayer(layers.street);
      layers.satellite.addTo(map);
      setBaseMap('satellite');
    } else {
      map.removeLayer(layers.satellite);
      layers.street.addTo(map);
      setBaseMap('street');
    }
  };

  const addTitikToMap = (titik: Titik, mapInstance?: L.Map) => {
    const m = mapInstance || map;
    if (!m || !L) return;
    
    let iconHTML = '';
    if (titik.iconType === 'trafo') {
      iconHTML = `
        <div class="marker-trafo-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </div>
      `;
    } else {
      iconHTML = `<div class="marker-dot-simple"></div>`;
    }
    
    const marker = L.marker([titik.lat, titik.lng], {
      icon: L.divIcon({
        className: 'custom-marker',
        html: iconHTML,
        iconSize: [24, 24]
      }),
      draggable: true
    }).addTo(m);

    const tooltipContent = `
      <div style="font-family: system-ui; padding: 8px;">
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px; color: #1f2937;">${titik.name}</div>
        ${titik.kapasitas ? `<div style="color: #059669; font-size: 13px; font-weight: 500; margin-bottom: 4px;">⚡ ${titik.kapasitas}</div>` : ''}
        <div style="color: #6b7280; font-size: 11px; border-top: 1px solid #e5e7eb; padding-top: 4px; margin-top: 4px;">
          <div>Lat: ${titik.lat.toFixed(6)}</div>
          <div>Lng: ${titik.lng.toFixed(6)}</div>
        </div>
      </div>
    `;
    
    marker.bindTooltip(tooltipContent, {
      direction: 'top',
      offset: [0, -10],
      opacity: 0.95
    });

    marker.bindPopup(`
      <div style="font-family: system-ui; padding: 4px;">
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${titik.name}</div>
        ${titik.kapasitas ? `<div style="color: #059669; font-size: 13px; font-weight: 500; margin-bottom: 4px;">⚡ Kapasitas: ${titik.kapasitas}</div>` : ''}
        <div style="color: #6b7280; font-size: 12px;">
          <div>Lat: ${titik.lat.toFixed(6)}</div>
          <div>Lng: ${titik.lng.toFixed(6)}</div>
        </div>
      </div>
    `);
    
    marker.on('click', () => {
      toggleSelectTitik(titik.id);
    });

    marker.on('dragend', (e: L.DragEndEvent) => {
      const newLatLng = e.target.getLatLng();
      updateTitikLocation(titik.id, newLatLng.lat, newLatLng.lng);
    });

    markersRef.current[titik.id] = marker;
    setTitiks(prev => [...prev, titik]);
  };

  const updateTitikLocation = (id: number, lat: number, lng: number) => {
    setTitiks(prev => prev.map(t => 
      t.id === id ? { ...t, lat, lng } : t
    ));
    
    const marker = markersRef.current[id];
    if (marker) {
      const titik = titiks.find(t => t.id === id);
      if (titik) {
        const tooltipContent = `
          <div style="font-family: system-ui; padding: 8px;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px; color: #1f2937;">${titik.name}</div>
            ${titik.kapasitas ? `<div style="color: #059669; font-size: 13px; font-weight: 500; margin-bottom: 4px;">⚡ ${titik.kapasitas}</div>` : ''}
            <div style="color: #6b7280; font-size: 11px; border-top: 1px solid #e5e7eb; padding-top: 4px; margin-top: 4px;">
              <div>Lat: ${lat.toFixed(6)}</div>
              <div>Lng: ${lng.toFixed(6)}</div>
            </div>
          </div>
        `;
        
        marker.setTooltipContent(tooltipContent);
        
        marker.setPopupContent(`
          <div style="font-family: system-ui; padding: 4px;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${titik.name}</div>
            ${titik.kapasitas ? `<div style="color: #059669; font-size: 13px; font-weight: 500; margin-bottom: 4px;">⚡ Kapasitas: ${titik.kapasitas}</div>` : ''}
            <div style="color: #6b7280; font-size: 12px;">
              <div>Lat: ${lat.toFixed(6)}</div>
              <div>Lng: ${lng.toFixed(6)}</div>
            </div>
          </div>
        `);
      }
    }
  };

  const toggleSelectTitik = (id: number) => {
    setSelectedTitiks(prev => {
      if (prev.includes(id)) {
        return prev.filter(tid => tid !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const calculateCableDistance = (straightDistance: number, slackPercent: number): number => {
    return straightDistance * (1 + slackPercent / 100);
  };

  const fetchRoute = async (points: Titik[]) => {
    if (points.length < 2) return null;
    
    const coordinates = points.map(p => `${p.lng},${p.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.code === 'Ok' && data.routes && data.routes[0]) {
        return {
          coordinates: data.routes[0].geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]),
          distance: data.routes[0].distance / 1000
        };
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
    return null;
  };

  useEffect(() => {
    const updateRoutes = async () => {
      if (!map || !L || selectedTitiks.length < 2) {
        linesRef.current.forEach(line => {
          if (map) {
            map.removeLayer(line);
          }
        });
        linesRef.current = [];
        setDistance(null);
        return;
      }

      linesRef.current.forEach(line => map.removeLayer(line));
      linesRef.current = [];

      const selectedPoints = titiks.filter(t => selectedTitiks.includes(t.id));
      
      if (routeType === 'straight') {
        let totalDist = 0;
        for (let i = 0; i < selectedPoints.length - 1; i++) {
          const p1 = selectedPoints[i];
          const p2 = selectedPoints[i + 1];
          
          const segmentDist = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
          const segmentCableDist = calculateCableDistance(segmentDist, cableSlackPercent);
          
          const line = L.polyline(
            [[p1.lat, p1.lng], [p2.lat, p2.lng]],
            { 
              color: '#3b82f6', 
              weight: 4, 
              opacity: 0.8,
              lineJoin: 'round',
              lineCap: 'round'
            }
          ).addTo(map);
          
          line.on('mouseover', () => {
            line.bindTooltip(
              `📏 Jarak Lurus: ${segmentDist.toFixed(3)} km<br>🔌 Panjang Kabel: ${segmentCableDist.toFixed(3)} km<br>📊 Slack: ${cableSlackPercent}%`,
              {
                permanent: false,
                direction: 'center',
                className: 'distance-tooltip'
              }
            ).openTooltip();
          });
          
          linesRef.current.push(line);
          totalDist += segmentDist;
        }
        setDistance(totalDist.toFixed(3));
      } else {
        setIsLoadingRoute(true);
        const routeData = await fetchRoute(selectedPoints);
        setIsLoadingRoute(false);
        
        if (routeData) {
          const line = L.polyline(routeData.coordinates, {
            color: '#10b981',
            weight: 5,
            opacity: 0.8,
            lineJoin: 'round',
            lineCap: 'round'
          }).addTo(map);
          
          for (let i = 0; i < selectedPoints.length - 1; i++) {
            const p1 = selectedPoints[i];
            const p2 = selectedPoints[i + 1];
            const segmentDist = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
            
            const midLat = (p1.lat + p2.lat) / 2;
            const midLng = (p1.lng + p2.lng) / 2;
            
            const tooltipMarker = L.circleMarker([midLat, midLng], {
              radius: 0,
              opacity: 0
            }).addTo(map);
            
            tooltipMarker.bindTooltip(`${segmentDist.toFixed(2)} km`, {
              permanent: false,
              direction: 'center',
              className: 'distance-tooltip'
            });
            
            linesRef.current.push(tooltipMarker as unknown as L.Polyline);
          }
          
          linesRef.current.push(line);
          setDistance(routeData.distance.toFixed(2));
        } else {
          const coords: [number, number][] = selectedPoints.map(p => [p.lat, p.lng]);
          const line = L.polyline(coords, {
            color: '#10b981',
            weight: 5,
            opacity: 0.8,
            lineJoin: 'round',
            lineCap: 'round'
          }).addTo(map);
          
          linesRef.current.push(line);
          
          let totalDist = 0;
          for (let i = 0; i < selectedPoints.length - 1; i++) {
            const p1 = selectedPoints[i];
            const p2 = selectedPoints[i + 1];
            totalDist += calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
          }
          setDistance(totalDist.toFixed(2));
        }
      }
    };

    updateRoutes();
  }, [selectedTitiks, routeType, titiks, map, L, cableSlackPercent]);

  const handleAddTitikByInput = () => {
    if (!inputCoordinates) return;
    
    const coords = inputCoordinates.split(',').map(c => c.trim());
    if (coords.length !== 2) {
      alert('Format koordinat tidak valid! Gunakan format: -5.15581458098708, 119.439241040987');
      return;
    }
    
    const lat = parseFloat(coords[0]);
    const lng = parseFloat(coords[1]);
    
    if (isNaN(lat) || isNaN(lng)) {
      alert('Koordinat tidak valid! Pastikan menggunakan angka yang benar.');
      return;
    }
    
    const newTitik: Titik = {
      id: Date.now(),
      lat: lat,
      lng: lng,
      name: inputName || `Titik ${titiks.length + 1}`,
      kapasitas: inputKapasitas,
      iconType: inputIconType
    };
    
    addTitikToMap(newTitik, map || undefined);
    setInputCoordinates('');
    setInputName('');
    setInputKapasitas('');
    setInputIconType('dot');
  };

  const returnToUserLocation = () => {
    if (map && userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 16, {
        duration: 1.5
      });
      userMarkerRef.current?.openPopup();
    }
  };

  const clearAllTitiks = () => {
    Object.values(markersRef.current).forEach(marker => {
      if (map) map.removeLayer(marker);
    });
    linesRef.current.forEach(line => {
      if (map) map.removeLayer(line);
    });
    markersRef.current = {};
    linesRef.current = [];
    setTitiks([]);
    setSelectedTitiks([]);
    setDistance(null);
  };

  const deleteTitik = (id: number) => {
    const marker = markersRef.current[id];
    if (marker && map) {
      map.removeLayer(marker);
    }
    delete markersRef.current[id];
    setTitiks(prev => prev.filter(t => t.id !== id));
    setSelectedTitiks(prev => prev.filter(tid => tid !== id));
  };

  const startEditTitik = (titik: Titik) => {
    setEditingTitik({
      id: titik.id,
      name: titik.name,
      lat: titik.lat.toString(),
      lng: titik.lng.toString(),
      kapasitas: titik.kapasitas,
      iconType: titik.iconType
    });
  };

  const cancelEditTitik = () => {
    setEditingTitik(null);
  };

  const saveEditTitik = () => {
    if (!editingTitik) return;
    
    const lat = parseFloat(editingTitik.lat);
    const lng = parseFloat(editingTitik.lng);
    
    if (isNaN(lat) || isNaN(lng)) {
      alert('Koordinat tidak valid!');
      return;
    }

    setTitiks(prev => prev.map(t => 
      t.id === editingTitik.id 
        ? { ...t, name: editingTitik.name, lat, lng, kapasitas: editingTitik.kapasitas, iconType: editingTitik.iconType } 
        : t
    ));

    const marker = markersRef.current[editingTitik.id];
    if (marker && L && map) {
      marker.setLatLng([lat, lng]);
      
      let iconHTML = '';
      if (editingTitik.iconType === 'trafo') {
        iconHTML = `
          <div class="marker-trafo-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
        `;
      } else {
        iconHTML = `<div class="marker-dot-simple"></div>`;
      }
      
      marker.setIcon(L.divIcon({
        className: 'custom-marker',
        html: iconHTML,
        iconSize: [24, 24]
      }));
      
      const tooltipContent = `
        <div style="font-family: system-ui; padding: 8px;">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px; color: #1f2937;">${editingTitik.name}</div>
          ${editingTitik.kapasitas ? `<div style="color: #059669; font-size: 13px; font-weight: 500; margin-bottom: 4px;">⚡ ${editingTitik.kapasitas}</div>` : ''}
          <div style="color: #6b7280; font-size: 11px; border-top: 1px solid #e5e7eb; padding-top: 4px; margin-top: 4px;">
            <div>Lat: ${lat.toFixed(6)}</div>
            <div>Lng: ${lng.toFixed(6)}</div>
          </div>
        </div>
      `;
      
      marker.setTooltipContent(tooltipContent);
      
      marker.setPopupContent(`
        <div style="font-family: system-ui; padding: 4px;">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${editingTitik.name}</div>
          ${editingTitik.kapasitas ? `<div style="color: #059669; font-size: 13px; font-weight: 500; margin-bottom: 4px;">⚡ Kapasitas: ${editingTitik.kapasitas}</div>` : ''}
          <div style="color: #6b7280; font-size: 12px;">
            <div>Lat: ${lat.toFixed(6)}</div>
            <div>Lng: ${lng.toFixed(6)}</div>
          </div>
        </div>
      `);
      
      map.panTo([lat, lng]);
    }

    setEditingTitik(null);
  };

  return (
    <div className="w-full h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <div 
          className={`bg-white shadow-xl border-r border-gray-200 flex flex-col transition-all duration-300 ${
            isSidebarOpen ? 'w-96' : 'w-0'
          } overflow-hidden`}
        >
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Add Titik by Coordinates */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-base">
                <div className="p-1.5 bg-blue-500 rounded-lg">
                  <Plus size={16} className="text-white" />
                </div>
                Tambah Titik Baru
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Nama lokasi (opsional)"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  suppressHydrationWarning
                />
                <input
                  type="text"
                  placeholder="Kapasitas gardu (e.g., 50 kVA)"
                  value={inputKapasitas}
                  onChange={(e) => setInputKapasitas(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  suppressHydrationWarning
                />
                <input
                  type="text"
                  placeholder="-5.15581458098708, 119.439241040987"
                  value={inputCoordinates}
                  onChange={(e) => setInputCoordinates(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono"
                  suppressHydrationWarning
                />
                <p className="text-xs text-gray-500">Format: latitude, longitude</p>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Pilih Ikon:</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setInputIconType('dot')}
                      className={`py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        inputIconType === 'dot'
                          ? 'bg-teal-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <div className="w-3 h-3 rounded-full bg-current"></div>
                      Titik Bulat
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputIconType('trafo')}
                      className={`py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        inputIconType === 'trafo'
                          ? 'bg-teal-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                      </svg>
                      Trafo
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleAddTitikByInput}
                  disabled={!inputCoordinates}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all text-sm font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Tambah Titik
                </button>
                <p className="text-xs text-gray-600 text-center">
                  💡 Atau klik langsung di peta untuk menambah titik
                </p>
              </div>
            </div>

            {/* Route Type */}
            {selectedTitiks.length >= 2 && (
              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-base">
                  <div className="p-1.5 bg-purple-500 rounded-lg">
                    <Ruler size={16} className="text-white" />
                  </div>
                  Tipe Garis
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setRouteType('straight')}
                    className={`py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
                      routeType === 'straight'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Garis Lurus
                  </button>
                  <button
                    onClick={() => setRouteType('route')}
                    disabled={isLoadingRoute}
                    className={`py-3 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      routeType === 'route'
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } disabled:opacity-50`}
                  >
                    {isLoadingRoute && <Loader2 size={14} className="animate-spin" />}
                    Rute Jalan
                  </button>
                </div>
              </div>
            )}

            {/* Satellite Toggle Control */}
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-base">
                <div className="p-1.5 bg-indigo-500 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <path d="M12 2v6M12 16v6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M16 12h6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24"/>
                  </svg>
                </div>
                Pengaturan Peta
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 font-medium">Tampilkan Toggle Satelit</span>
                  <button
                    onClick={() => setShowSatelliteToggle(!showSatelliteToggle)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      showSatelliteToggle ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        showSatelliteToggle ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                {showSatelliteToggle && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">Tampilan Peta Saat Ini:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={toggleBaseMap}
                        disabled={baseMap === 'street'}
                        className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                          baseMap === 'street'
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                          <polyline points="9 22 9 12 15 12 15 22"/>
                        </svg>
                        Jalan
                      </button>
                      <button
                        onClick={toggleBaseMap}
                        disabled={baseMap === 'satellite'}
                        className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                          baseMap === 'satellite'
                            ? 'bg-green-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="7" height="7"/>
                          <rect x="14" y="3" width="7" height="7"/>
                          <rect x="14" y="14" width="7" height="7"/>
                          <rect x="3" y="14" width="7" height="7"/>
                        </svg>
                        Satelit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Distance */}
            {distance && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200 shadow-sm">
                <h3 className="font-semibold text-green-800 mb-2 text-sm">Total Jarak</h3>
                <p className="text-4xl font-bold text-green-600">{distance} <span className="text-xl">km</span></p>
                <p className="text-xs text-green-700 mt-2">
                  {routeType === 'route' ? '🚗 Jarak via jalan' : '📏 Jarak lurus'}
                </p>
              </div>
            )}

            {/* Titik List */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800 text-base">
                  Daftar Titik <span className="text-blue-500">({titiks.length})</span>
                </h3>
                {titiks.length > 0 && (
                  <button
                    onClick={clearAllTitiks}
                    className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1.5 font-medium hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all"
                  >
                    <Trash2 size={14} />
                    Hapus Semua
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {titiks.map((titik, idx) => (
                  <div
                    key={titik.id}
                    className={`rounded-xl transition-all ${
                      selectedTitiks.includes(titik.id)
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-400 shadow-md'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 hover:shadow-sm'
                    }`}
                  >
                    {editingTitik?.id === titik.id ? (
                      <div className="p-4 space-y-3">
                        <input
                          type="text"
                          value={editingTitik.name}
                          onChange={(e) => setEditingTitik({ ...editingTitik, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          placeholder="Nama lokasi"
                          suppressHydrationWarning
                        />
                        <input
                          type="text"
                          value={editingTitik.kapasitas}
                          onChange={(e) => setEditingTitik({ ...editingTitik, kapasitas: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          placeholder="Kapasitas gardu"
                          suppressHydrationWarning
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            step="any"
                            value={editingTitik.lat}
                            onChange={(e) => setEditingTitik({ ...editingTitik, lat: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            placeholder="Latitude"
                          />
                          <input
                            type="number"
                            step="any"
                            value={editingTitik.lng}
                            onChange={(e) => setEditingTitik({ ...editingTitik, lng: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            placeholder="Longitude"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">Ikon:</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingTitik({ ...editingTitik, iconType: 'dot' })}
                              className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                                editingTitik.iconType === 'dot'
                                  ? 'bg-teal-500 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              <div className="w-2 h-2 rounded-full bg-current"></div>
                              Titik
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTitik({ ...editingTitik, iconType: 'trafo' })}
                              className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                                editingTitik.iconType === 'trafo'
                                  ? 'bg-teal-500 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                              </svg>
                              Trafo
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={saveEditTitik}
                            className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-all text-sm font-medium flex items-center justify-center gap-1"
                          >
                            <Save size={14} />
                            Simpan
                          </button>
                          <button
                            onClick={cancelEditTitik}
                            className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-all text-sm font-medium flex items-center justify-center gap-1"
                          >
                            <X size={14} />
                            Batal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div 
                            onClick={() => toggleSelectTitik(titik.id)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 cursor-pointer ${
                              selectedTitiks.includes(titik.id) ? 'bg-blue-500' : 'bg-red-500'
                            }`}
                          >
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0" onClick={() => toggleSelectTitik(titik.id)}>
                            <p className="font-semibold text-sm text-gray-800 truncate cursor-pointer">{titik.name}</p>
                            {titik.kapasitas && (
                              <p className="text-xs text-green-600 font-medium mt-0.5">⚡ {titik.kapasitas}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-0.5 cursor-pointer">
                              {titik.lat.toFixed(6)}, {titik.lng.toFixed(6)}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {titik.iconType === 'trafo' ? (
                                <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                                  </svg>
                                  Trafo
                                </span>
                              ) : (
                                <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                                  Titik
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-blue-500 mt-1">🖱️ Drag marker di peta untuk pindah</p>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditTitik(titik);
                              }}
                              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded-lg transition-all"
                              title="Edit titik"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTitik(titik.id);
                              }}
                              className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                              title="Hapus titik"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {titiks.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MapPin className="text-gray-400" size={32} />
                  </div>
                  <p className="text-sm text-gray-500">Belum ada titik</p>
                  <p className="text-xs text-gray-400 mt-1">Klik peta atau input koordinat untuk mulai</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-white p-2 rounded-r-lg shadow-lg hover:bg-gray-50 transition-all z-[1000] border-r border-t border-b border-gray-200"
          style={{ left: isSidebarOpen ? '384px' : '0' }}
        >
          {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>

        <div className="flex-1 relative">
          {isLoadingLocation && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-[1001]">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-3" />
                <p className="text-gray-700 font-medium">Mencari lokasi Anda...</p>
                <p className="text-sm text-gray-500 mt-1">Mohon izinkan akses lokasi</p>
              </div>
            </div>
          )}
          
          <div ref={mapRef} className="w-full h-full" />
          
          {showZoomWarning && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-6 py-3 rounded-lg shadow-lg z-[1000] flex items-center gap-2 animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span className="font-medium text-sm">Detail peta mungkin terbatas pada zoom ini</span>
            </div>
          )}
          
          <button
            onClick={returnToUserLocation}
            className="absolute top-6 right-6 bg-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all z-[1000] group hover:bg-blue-50 border border-gray-200"
            title="Kembali ke lokasi saya"
          >
            <Navigation size={24} className="text-blue-500 group-hover:scale-110 transition-transform" />
          </button>
          
          {showSatelliteToggle && (
            <button
              onClick={toggleBaseMap}
              className="absolute top-24 right-6 bg-white px-4 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all z-[1000] hover:scale-105 border border-gray-200 flex items-center gap-2 font-medium text-sm"
              title={baseMap === 'street' ? 'Ganti ke Satelit' : 'Ganti ke Peta Jalan'}
            >
              {baseMap === 'street' ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                  </svg>
                  <span className="text-gray-700">Satelit</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                  <span className="text-gray-700">Jalan</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        :global(.distance-tooltip) {
          background: rgba(0, 0, 0, 0.85) !important;
          border: none !important;
          border-radius: 8px !important;
          color: white !important;
          font-weight: 600 !important;
          font-size: 13px !important;
          padding: 6px 12px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
        }
        :global(.distance-tooltip:before) {
          border-top-color: rgba(0, 0, 0, 0.85) !important;
        }
        :global(.marker-dot-simple) {
          background: #14b8a6;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(20, 184, 166, 0.4);
          cursor: pointer;
          transition: transform 0.2s;
        }
        :global(.marker-dot-simple:hover) {
          transform: scale(1.2);
        }
        :global(.marker-trafo-icon) {
          background: #14b8a6;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid white;
          display: flex;
          align-items: center;
          justify-center;
          box-shadow: 0 2px 8px rgba(20, 184, 166, 0.4);
          cursor: pointer;
          transition: transform 0.2s;
        }
        :global(.marker-trafo-icon:hover) {
          transform: scale(1.2);
        }
      `}</style>
    </div>
  );
};

export default Maps;