import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Zap, BatteryCharging, Gauge, MapPin, Play, Pause, RotateCcw, ShieldCheck, Leaf, DollarSign, Clock, Layers, Truck, AlertTriangle, CheckCircle2, Globe, Map } from 'lucide-react';
import { Map as MapLibreMap, Marker, Popup, NavigationControl, LngLatBounds } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { loadMapStyle, INK, FOREST, TURMERIC, TERRACOTTA } from '../../shared/map/mapTheme';
import { optimizeEVRoute } from '../../services/apiV2';
import { useFleet } from './useFleet';

const FALLBACK_VEHICLES = [
  { id: 'veh-ev-01', vehicleNo: 'MH 15 EV 8821', driverName: 'Ramesh Patil (Demo)', batteryCapacityKwh: 40, currentSoc: 35, maxRangeKm: 180, capacityKg: 1500, vehicleType: 'E-Pickup' },
  { id: 'veh-ev-02', vehicleNo: 'MH 17 EV 3042', driverName: 'Sanjay Pawar (Demo)', batteryCapacityKwh: 55, currentSoc: 65, maxRangeKm: 240, capacityKg: 2200, vehicleType: 'E-Pickup' },
];

// Geographic Corridor Coordinates [Longitude, Latitude]
const CORRIDOR_COORDS = {
  'KPG-DEPOT': [74.4765, 19.8826],
  'KPG-APMC': [74.4712, 19.8801],
  'RAHATA': [74.4842, 19.8052],
  'SHIRDI': [74.4777, 19.7645],
  'SANGAMNER': [74.2084, 19.5772],
  'NASHIK': [73.7898, 19.9975],
};

// MapLibre Map Component for Cartographic EV Corridor View
const EvMapCanvas = ({ originCode, destCode, stations = [], progress = 0, liveSoc, vehicleNo, optResult, isChargingState }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const vehicleMarkerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  const originCoords = CORRIDOR_COORDS[originCode] || CORRIDOR_COORDS['KPG-DEPOT'];
  const destCoords = CORRIDOR_COORDS[destCode] || CORRIDOR_COORDS['NASHIK'];

  // Check if route includes an EV Charging Station stop
  const chargingStationCoords = useMemo(() => {
    if (optResult?.requiresChargingStop && optResult?.chargingStop?.station?.coordinates) {
      return optResult.chargingStop.station.coordinates;
    }
    return null;
  }, [optResult]);

  // Coordinates array forming the complete route line
  const routeWaypoints = useMemo(() => {
    if (chargingStationCoords) {
      return [originCoords, chargingStationCoords, destCoords];
    }
    return [originCoords, destCoords];
  }, [originCoords, chargingStationCoords, destCoords]);

  // Interpolate vehicle position along real map coordinates [lng, lat]
  const currentVehCoords = useMemo(() => {
    if (!chargingStationCoords) {
      const lng = originCoords[0] + (destCoords[0] - originCoords[0]) * (progress / 100);
      const lat = originCoords[1] + (destCoords[1] - originCoords[1]) * (progress / 100);
      return [lng, lat];
    }

    // Detour Leg 1: Origin to Charging Station (0% -> 40%)
    if (progress <= 40) {
      const ratio = progress / 40;
      const lng = originCoords[0] + (chargingStationCoords[0] - originCoords[0]) * ratio;
      const lat = originCoords[1] + (chargingStationCoords[1] - originCoords[1]) * ratio;
      return [lng, lat];
    } 
    // Leg 2: Parked at Charging Station (40% -> 45%)
    else if (progress <= 45) {
      return chargingStationCoords;
    } 
    // Detour Leg 3: Charging Station to Destination (45% -> 100%)
    else {
      const ratio = (progress - 45) / 55;
      const lng = chargingStationCoords[0] + (destCoords[0] - chargingStationCoords[0]) * ratio;
      const lat = chargingStationCoords[1] + (destCoords[1] - chargingStationCoords[1]) * ratio;
      return [lng, lat];
    }
  }, [originCoords, chargingStationCoords, destCoords, progress]);

  // Initialize MapLibre GL map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    loadMapStyle().then((style) => {
      if (!containerRef.current) return;

      const map = new MapLibreMap({
        container: containerRef.current,
        style,
        center: [74.2, 19.85],
        zoom: 9.5,
        attributionControl: false,
      });

      map.addControl(new NavigationControl({ showCompass: false }), 'top-right');

      map.on('load', () => {
        mapRef.current = map;
        setMapReady(true);

        map.addSource('ev-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: routeWaypoints,
            },
          },
        });

        map.addLayer({
          id: 'ev-route-line',
          type: 'line',
          source: 'ev-route',
          paint: {
            'line-color': '#059669',
            'line-width': 5,
            'line-opacity': 0.9,
          },
        });
      });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Ensure map container resizes properly when mounted
  useEffect(() => {
    if (mapRef.current && mapReady) {
      const timer = setTimeout(() => {
        mapRef.current?.resize();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [mapReady]);

  // Update Route Line & Fit Map Bounds
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;

    const routeSource = map.getSource('ev-route');
    if (routeSource) {
      routeSource.setData({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: routeWaypoints,
        },
      });
    }

    const bounds = new LngLatBounds();
    routeWaypoints.forEach((pt) => bounds.extend(pt));
    map.fitBounds(bounds, { padding: 60, maxZoom: 12 });
  }, [mapReady, routeWaypoints]);

  // Render Pins for Origin, Destination, and Stations
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;
    const createdMarkers = [];

    // Origin Marker
    const elOrg = document.createElement('div');
    elOrg.className = 'flex items-center justify-center px-2 py-1 rounded-lg bg-emerald-800 text-white font-extrabold text-[11px] border border-white shadow-lg';
    elOrg.innerText = `🟢 ${originCode}`;
    const mOrg = new Marker({ element: elOrg }).setLngLat(originCoords).addTo(map);
    createdMarkers.push(mOrg);

    // Dest Marker
    const elDest = document.createElement('div');
    elDest.className = 'flex items-center justify-center px-2 py-1 rounded-lg bg-amber-700 text-white font-extrabold text-[11px] border border-white shadow-lg';
    elDest.innerText = `🏁 ${destCode}`;
    const mDest = new Marker({ element: elDest }).setLngLat(destCoords).addTo(map);
    createdMarkers.push(mDest);

    // EV Charging Stations
    stations.forEach((st) => {
      const coords = st.coordinates;
      if (!coords) return;
      const isSelected = optResult?.requiresChargingStop && optResult?.chargingStop?.station?.id === st.id;

      const el = document.createElement('div');
      el.className = `cursor-pointer group relative flex items-center justify-center w-8 h-8 rounded-full shadow-lg font-black text-xs transition-all ${
        isSelected
          ? 'bg-emerald-600 border-2 border-white text-white scale-125 ring-4 ring-emerald-400/50'
          : 'bg-slate-900 border-2 border-emerald-400 text-emerald-400'
      }`;
      el.innerText = '⚡';

      const popupHtml = `
        <div style="font-family: Mukta, sans-serif; padding: 6px;">
          <h4 style="font-weight: 800; color: #0f172a; margin-bottom: 2px;">${st.name}</h4>
          <p style="font-size: 11px; color: #059669; font-weight: 800;">${st.connectorType} · ${st.chargerKw} kW DC Fast Charger</p>
          <p style="font-size: 11px; color: #475569;">Availability: <b>${st.portsAvailable}/${st.totalPorts} Free Ports</b></p>
          <p style="font-size: 11px; color: #d97706; font-weight: 800;">Commercial Tariff: ₹${st.costPerKwhRs}/kWh</p>
        </div>
      `;

      const popup = new Popup({ offset: 15 }).setHTML(popupHtml);
      const marker = new Marker({ element: el }).setLngLat(coords).setPopup(popup).addTo(map);
      createdMarkers.push(marker);
    });

    return () => {
      createdMarkers.forEach((m) => m.remove());
    };
  }, [mapReady, stations, originCoords, destCoords, optResult]);

  // Animated Vehicle Marker
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;

    if (!vehicleMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'flex items-center gap-1 bg-slate-950 border-2 border-emerald-400 text-white font-extrabold px-2.5 py-1 rounded-xl shadow-2xl transition-all';
      el.id = 'ev-live-vehicle-marker';
      const m = new Marker({ element: el }).setLngLat(currentVehCoords).addTo(map);
      vehicleMarkerRef.current = m;
    } else {
      vehicleMarkerRef.current.setLngLat(currentVehCoords);
    }

    const markerEl = document.getElementById('ev-live-vehicle-marker');
    if (markerEl) {
      markerEl.innerHTML = `
        <span style="font-size:13px;">🚚</span>
        <span style="font-size:10px; font-weight:800; color:#34d399;">${vehicleNo || 'E-Pickup'}</span>
        <span style="font-size:10px; font-weight:900; background:#047857; padding:1px 5px; border-radius:4px; ${liveSoc < 20 ? 'color:#f43f5e;' : 'color:#ffffff;'}">${liveSoc}%</span>
      `;
    }
  }, [mapReady, currentVehCoords, liveSoc, vehicleNo]);

  return (
    <div className="relative w-full h-[360px] rounded-2xl overflow-hidden border-2 border-slate-300 shadow-sm bg-slate-900">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

export const EvFleetSimulator = () => {
  const { vehicles: userFleetVehicles, loading: fleetLoading } = useFleet();

  // Combine registered user fleet vehicles and fallbacks
  const availableVehicles = useMemo(() => {
    const userEvs = (userFleetVehicles || []).map((v) => ({
      id: String(v._id || v.id || v.vehicleNo),
      vehicleNo: v.vehicleNo,
      driverName: v.driverName || 'Fleet Owner Driver',
      batteryCapacityKwh: v.batteryCapacityKwh || (v.vehicleType === 'E-Pickup' ? 45 : 50),
      currentSoc: v.currentSoc || 40,
      maxRangeKm: v.maxRangeKm || 190,
      capacityKg: v.capacityKg || 1500,
      vehicleType: v.vehicleType || 'E-Pickup',
      isUserVehicle: true,
    }));

    if (userEvs.length > 0) {
      return [...userEvs, ...FALLBACK_VEHICLES];
    }
    return FALLBACK_VEHICLES;
  }, [userFleetVehicles]);

  const [selectedVehId, setSelectedVehId] = useState(availableVehicles[0].id);
  const [currentSoc, setCurrentSoc] = useState(availableVehicles[0].currentSoc || 35);
  const [cargoWeightKg, setCargoWeightKg] = useState(1200);
  const [originCode, setOriginCode] = useState('KPG-DEPOT');
  const [destCode, setDestCode] = useState('NASHIK');
  const [viewMode, setViewMode] = useState('carto'); // 'carto' | 'hud'
  
  const [optResult, setOptResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Simulation State
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [simSpeed, setSimSpeed] = useState(1);
  const [isChargingState, setIsChargingState] = useState(false);
  const animRef = useRef(null);

  useEffect(() => {
    if (availableVehicles.length > 0 && !availableVehicles.find((v) => v.id === selectedVehId)) {
      setSelectedVehId(availableVehicles[0].id);
      setCurrentSoc(availableVehicles[0].currentSoc || 35);
    }
  }, [availableVehicles]);

  const selectedVehicle = availableVehicles.find((v) => v.id === selectedVehId) || availableVehicles[0];

  const handleVehicleSelect = (vId) => {
    setSelectedVehId(vId);
    const veh = availableVehicles.find((v) => v.id === vId);
    if (veh && veh.currentSoc) {
      setCurrentSoc(veh.currentSoc);
    }
  };

  const runOptimization = async () => {
    setLoading(true);
    try {
      const res = await optimizeEVRoute({
        batteryCapacityKwh: selectedVehicle.batteryCapacityKwh,
        currentSoc,
        cargoWeightKg: Number(cargoWeightKg),
        distanceKm: destCode === 'SHIRDI' ? 16.2 : destCode === 'NASHIK' ? 68.5 : 24.5,
        originCode,
        destCode,
      });
      setOptResult(res);
      setProgress(0);
      setIsPlaying(false);
    } catch (err) {
      console.error('Failed to calculate EV optimization:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runOptimization();
  }, [selectedVehId, currentSoc, cargoWeightKg, originCode, destCode]);

  // Simulation loop
  useEffect(() => {
    if (isPlaying) {
      animRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 38 && prev <= 42 && optResult?.requiresChargingStop && !isChargingState) {
            setIsChargingState(true);
            setTimeout(() => {
              setIsChargingState(false);
            }, 2500);
          }

          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return prev + 0.4 * simSpeed;
        });
      }, 100);
    } else {
      clearInterval(animRef.current);
    }
    return () => clearInterval(animRef.current);
  }, [isPlaying, simSpeed, optResult, isChargingState]);

  const calculateLiveSoc = () => {
    if (!optResult) return currentSoc;
    const initial = currentSoc;
    const requiresStop = optResult.requiresChargingStop;

    if (progress < 40) {
      const drop = requiresStop ? (initial - 15) * (progress / 40) : (initial - optResult.predictedSocWithoutCharge) * (progress / 100);
      return Math.max(5, Math.round(initial - drop));
    } else if (progress >= 40 && progress <= 45 && requiresStop) {
      return isChargingState ? 65 : 85;
    } else {
      const postChargeStart = requiresStop ? 85 : initial;
      const targetDestSoc = optResult.chargingStop ? optResult.chargingStop.postChargeSocAtDest : optResult.predictedSocWithoutCharge;
      const remainingProgress = (progress - 45) / 55;
      return Math.max(10, Math.round(postChargeStart - (postChargeStart - targetDestSoc) * remainingProgress));
    }
  };

  const liveSoc = calculateLiveSoc();

  return (
    <div className="space-y-6">
      {/* Configuration & Parameter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <Zap className="h-5 w-5 fill-white" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">E-Pickup EV Charging & Route Optimization</h2>
              <p className="text-xs text-slate-500 font-medium">Select your registered fleet vehicle to simulate battery-aware corridor navigation</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-300 text-xs font-bold">
              <button
                onClick={() => setViewMode('carto')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'carto' ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                Cartographic Map
              </button>
              <button
                onClick={() => setViewMode('hud')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'hud' ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                Telemetry HUD
              </button>
            </div>

            <button
              onClick={runOptimization}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 px-4 py-2 rounded-xl transition-all shadow-sm"
            >
              {loading ? 'Calculating...' : 'Recalculate EV Route'}
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Select Fleet E-Pickup {fleetLoading && '(Loading fleet...)'}
            </label>
            <select
              value={selectedVehId}
              onChange={(e) => handleVehicleSelect(e.target.value)}
              className="w-full rounded-xl border-2 border-emerald-600 bg-emerald-50/50 px-3 py-2.5 text-sm font-extrabold text-emerald-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {availableVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.isUserVehicle ? `[Mine Fleet] ${v.vehicleNo}` : `${v.vehicleNo}`} ({v.driverName}) — {v.batteryCapacityKwh} kWh
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Current Battery Level (SoC: {currentSoc}%)
            </label>
            <input
              type="range"
              min="10"
              max="100"
              value={currentSoc}
              onChange={(e) => setCurrentSoc(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 mt-2"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Cargo Payload Weight (kg)</label>
            <input
              type="number"
              value={cargoWeightKg}
              onChange={(e) => setCargoWeightKg(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="1200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Destination Corridor</label>
            <select
              value={destCode}
              onChange={(e) => setDestCode(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="NASHIK">Nashik CBS Central (68.5 km)</option>
              <option value="SHIRDI">Shirdi Bus Stand (16.2 km)</option>
              <option value="SANGAMNER">Sangamner Central (45.0 km)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Telemetry Summary Cards */}
      {optResult && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
              <span>Energy Required</span>
              <BatteryCharging className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-3 font-display text-2xl sm:text-3xl font-black text-slate-900">
              {optResult.totalEnergyRequiredKwh} <span className="text-sm font-bold text-slate-500">kWh</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">Rate: {optResult.consumptionRateKwhPerKm} kWh/km</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
              <span>EV Charging Pit-Stop</span>
              {optResult.requiresChargingStop ? (
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-extrabold text-[10px]">REQUIRED</span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">DIRECT</span>
              )}
            </div>
            <p className="mt-3 font-display text-xl sm:text-2xl font-black text-slate-900 truncate">
              {optResult.requiresChargingStop ? optResult.chargingStop.station.name.split(' ')[0] : 'No Stop Needed'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              {optResult.requiresChargingStop ? `+${optResult.chargingStop.dwellTimeMin} min Fast Charge` : 'Direct Delivery'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
              <span>Carbon Offset ($CO_2$)</span>
              <Leaf className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-3 font-display text-2xl sm:text-3xl font-black text-emerald-700">
              {optResult.co2SavedKg} <span className="text-sm font-bold">kg</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">Zero Tailpipe Emissions</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
              <span>Fuel Cost Savings</span>
              <DollarSign className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-3 font-display text-2xl sm:text-3xl font-black text-slate-900">
              ₹{optResult.fuelCostSavedRs}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">vs Commercial Diesel Freight</p>
          </div>
        </div>
      )}

      {/* Map Visual Simulator Container */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-emerald-700" />
            <h3 className="font-display text-base font-bold text-slate-900">
              {viewMode === 'carto' ? 'Cartographic Interactive EV Route Map' : 'Dynamic Telemetry Vector Map'}
            </h3>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Zap className={`h-4 w-4 ${liveSoc < 20 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`} />
            <span className="font-bold">Live Vehicle Battery SoC:</span>
            <span className={`font-mono font-black text-sm ${liveSoc < 20 ? 'text-rose-400' : 'text-emerald-400'}`}>{liveSoc}%</span>
          </div>
        </div>

        {/* View Mode Component */}
        {viewMode === 'carto' ? (
          <EvMapCanvas
            originCode={originCode}
            destCode={destCode}
            stations={optResult?.allStations || []}
            progress={progress}
            liveSoc={liveSoc}
            vehicleNo={selectedVehicle.vehicleNo}
            optResult={optResult}
            isChargingState={isChargingState}
          />
        ) : (
          <div className="relative h-80 w-full rounded-2xl bg-slate-950 overflow-hidden border border-slate-800 shadow-inner flex flex-col justify-between p-5">
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(#10b981 1px, transparent 1px), radial-gradient(#38bdf8 1px, #020617 1px)`,
                backgroundSize: '30px 30px',
                backgroundPosition: '0 0, 15px 15px',
              }}
            />

            <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-800 text-xs text-white">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-emerald-400" />
                <span className="font-bold">{selectedVehicle.vehicleNo}</span>
                <span className="text-slate-400">({selectedVehicle.driverName})</span>
              </div>

              {isChargingState ? (
                <div className="flex items-center gap-1.5 text-amber-300 font-extrabold bg-amber-950/80 px-3 py-1 rounded-lg border border-amber-500 animate-pulse">
                  <Zap className="h-4 w-4 text-amber-400 fill-amber-400" />
                  <span>FAST CHARGING IN PROGRESS (60 kW DC) — 85% TARGET</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-slate-300 font-bold text-[11px]">
                  <span>Corridor: {originCode} ➔ {destCode}</span>
                  <span>Range: {selectedVehicle.maxRangeKm} km</span>
                </div>
              )}
            </div>

            <div className="relative z-10 my-auto h-44 w-full">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 800 160">
                <line x1="100" y1="80" x2="700" y2="80" stroke="#10b981" strokeWidth="8" strokeLinecap="round" />

                <g transform="translate(100, 80)">
                  <circle r="12" fill="#047857" stroke="#ffffff" strokeWidth="2" />
                  <text x="0" y="4" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle">O</text>
                  <text x="0" y="28" fill="#e2e8f0" fontSize="11" fontWeight="bold" textAnchor="middle">{originCode}</text>
                </g>

                {optResult?.allStations.map((station, idx) => {
                  const stationX = 260 + idx * 110;
                  const isSelected = optResult?.requiresChargingStop && optResult?.chargingStop?.station?.id === station.id;
                  return (
                    <g key={station.id} transform={`translate(${stationX}, 80)`}>
                      {isSelected && (
                        <circle r="22" fill="rgba(16, 185, 129, 0.35)" className="animate-ping" />
                      )}
                      <circle r="14" fill={isSelected ? '#059669' : '#1e293b'} stroke="#10b981" strokeWidth="2" />
                      <text x="0" y="4" fill="#10b981" fontSize="10" fontWeight="900" textAnchor="middle">⚡</text>
                      <text x="0" y="30" fill="#cbd5e1" fontSize="9" fontWeight="bold" textAnchor="middle">{station.code}</text>

                      <g transform="translate(0, -22)">
                        <rect x="-24" y="-9" width="48" height="14" rx="4" fill="#0f172a" stroke="#10b981" strokeWidth="1" />
                        <text x="0" y="1" fill="#34d399" fontSize="8" fontWeight="black" textAnchor="middle">
                          {station.portsAvailable}/{station.totalPorts} Free
                        </text>
                      </g>
                    </g>
                  );
                })}

                <g transform="translate(700, 80)">
                  <circle r="12" fill="#d97706" stroke="#ffffff" strokeWidth="2" />
                  <text x="0" y="4" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle">D</text>
                  <text x="0" y="28" fill="#e2e8f0" fontSize="11" fontWeight="bold" textAnchor="middle">{destCode}</text>
                </g>

                {(() => {
                  const vehX = 100 + (progress / 100) * 600;
                  const vehY = 80;
                  return (
                    <g transform={`translate(${vehX}, ${vehY})`} className="transition-transform duration-75">
                      <circle r="18" fill="rgba(16, 185, 129, 0.4)" className="animate-pulse" />
                      <rect x="-18" y="-12" width="36" height="24" rx="6" fill="#047857" stroke="#ffffff" strokeWidth="2" />
                      <rect x="8" y="-8" width="6" height="16" rx="2" fill="#38bdf8" />
                      <text x="-6" y="4" fill="#ffffff" fontSize="8" fontWeight="black">EV</text>

                      <g transform="translate(0, -24)">
                        <rect x="-22" y="-10" width="44" height="16" rx="4" fill="#0f172a" stroke={liveSoc < 20 ? '#f43f5e' : '#10b981'} strokeWidth="1.5" />
                        <text x="0" y="1" fill={liveSoc < 20 ? '#f43f5e' : '#34d399'} fontSize="9" fontWeight="black" textAnchor="middle">
                          {liveSoc}%
                        </text>
                      </g>
                    </g>
                  );
                })()}
              </svg>
            </div>
          </div>
        )}

        {/* Simulation Controls */}
        <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? 'Pause Simulation' : 'Play EV Route Simulation ▶'}
          </button>

          <button
            onClick={() => { setIsPlaying(false); setProgress(0); }}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[1, 2, 5].map((s) => (
              <button
                key={s}
                onClick={() => setSimSpeed(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                  simSpeed === s ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-[160px] flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Progress:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <span className="text-xs font-mono font-black text-emerald-400 w-10 text-right">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvFleetSimulator;
