import React, { useState, useEffect, useRef } from 'react';
import { Navigation, AlertTriangle, Clock, Zap, ShieldCheck, MapPin, RefreshCw, Compass, ArrowRight, Activity, Sliders, Play, Pause, RotateCcw, Bus, Layers, CheckCircle2, Gauge, Flame } from 'lucide-react';
import { getTomTomTraffic, getBusStops } from '../../services/apiV2';

const DEFAULT_BUS_STOPS = [
  { code: 'KPG-DEPOT', name: 'Kopargaon ST Depot', nameMr: 'कोपरगाव एसटी डेपो' },
  { code: 'KPG-APMC', name: 'Kopargaon APMC Mandi', nameMr: 'कोपरगाव एपीएमसी' },
  { code: 'SANWATSAR', name: 'Sanwatsar Bus Stop', nameMr: 'सानवत्सर बस स्टॉप' },
  { code: 'POHEGAON', name: 'Pohegaon Stand', nameMr: 'पोहेगाव स्टँड' },
  { code: 'KOLPEWADI', name: 'Kolpewadi Junction', nameMr: 'कोलपेवाडी फाटा' },
  { code: 'DHAMORI', name: 'Dhamori Village', nameMr: 'धामोरी गाव' },
  { code: 'CHAS-NALI', name: 'Chas Nali Cross', nameMr: 'चास नाळी क्रॉस' },
  { code: 'KARANJI-BK', name: 'Karanji Budruk', nameMr: 'करंजी बु' },
  { code: 'MANJUR', name: 'Manjur Station', nameMr: 'मंजूर स्टेशन' },
  { code: 'SHINGNAPUR', name: 'Shingnapur Bus Stop', nameMr: 'शिंगनापूर बस स्टॉप' },
  { code: 'RAWANDA', name: 'Rawanda Square', nameMr: 'रावंडा चौक' },
  { code: 'SHIRDI', name: 'Shirdi Bus Stand', nameMr: 'शिर्डी बस स्टँड' },
  { code: 'RAHATA', name: 'Rahata Bus Junction', nameMr: 'राहाता बस जंक्शन' },
  { code: 'SANGAMNER', name: 'Sangamner Central Depot', nameMr: 'संगमनेर सेंट्रल डेपो' },
  { code: 'NASHIK', name: 'Nashik CBS Central', nameMr: 'नाशिक सीबीएस सेंट्रल' },
  { code: 'AHMEDNAGAR', name: 'Ahmednagar Central Stand', nameMr: 'अहमदनगर सेंट्रल स्टँड' },
];

/**
 * Interactive TomTom Traffic Map Simulator Component
 */
const TomTomTrafficMapSimulator = ({ originCode, destCode, trafficData }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100%
  const [simSpeed, setSimSpeed] = useState(1); // 1x, 2x, 5x
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showBypass, setShowBypass] = useState(true);
  const animRef = useRef(null);

  // Auto animation ticker
  useEffect(() => {
    if (isPlaying) {
      animRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return prev + 0.5 * simSpeed;
        });
      }, 100);
    } else {
      clearInterval(animRef.current);
    }
    return () => clearInterval(animRef.current);
  }, [isPlaying, simSpeed]);

  const handleReset = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const isCongested = trafficData?.congestionLevel === 'heavy';
  const isModerate = trafficData?.congestionLevel === 'moderate';

  // Calculate live simulated bus position metrics along the route
  const currentSegmentName =
    progress < 30
      ? 'Depot Exit & City Arterial'
      : progress < 65
      ? 'APMC Mandi Unloading Junction'
      : 'State Highway Expressway Approach';

  const currentSpeed =
    progress >= 30 && progress <= 65
      ? isCongested
        ? 14
        : isModerate
        ? 28
        : 45
      : 52;

  const currentDelay = Math.round((progress / 100) * (trafficData?.trafficDelayMin || 0));

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
      {/* Header & Map Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-md shadow-emerald-700/20">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">TomTom Interactive Route & Traffic Simulator Map</h3>
            <p className="text-xs text-slate-500 font-medium">Real-time GPS movement simulation for MSRTC Bus Corridor</p>
          </div>
        </div>

        {/* Layer Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              showHeatmap
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            <Flame className="inline h-3.5 w-3.5 mr-1 text-rose-600" />
            Heatmap Layer {showHeatmap ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => setShowBypass(!showBypass)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              showBypass
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            <Navigation className="inline h-3.5 w-3.5 mr-1 text-emerald-700" />
            NH-160 Bypass {showBypass ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Main Map Visual Canvas */}
      <div className="relative h-80 w-full rounded-2xl bg-slate-950 overflow-hidden border border-slate-800 shadow-inner flex flex-col justify-between p-5">
        {/* Map Grid Pattern background */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#10b981 1px, transparent 1px), radial-gradient(#38bdf8 1px, #020617 1px)`,
            backgroundSize: '30px 30px',
            backgroundPosition: '0 0, 15px 15px',
          }}
        />

        {/* Top Floating Map Telemetry Bar */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-extrabold text-white">Live Telemetry:</span>
            <span className="text-emerald-400 font-bold">{currentSegmentName}</span>
          </div>

          <div className="flex items-center gap-4 text-slate-300 font-bold">
            <div className="flex items-center gap-1.5">
              <Gauge className="h-4 w-4 text-amber-400" />
              <span>{currentSpeed} km/h</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-rose-400" />
              <span>+{currentDelay} min delay accrued</span>
            </div>
          </div>
        </div>

        {/* Map Route Graphics SVG Overlay */}
        <div className="relative z-10 my-auto h-44 w-full">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 800 160">
            {/* Background Grid Lines */}
            <line x1="50" y1="80" x2="750" y2="80" stroke="#1e293b" strokeWidth="2" strokeDasharray="4 4" />

            {/* NH-160 Bypass Curved Path (Dashed Emerald Line) */}
            {showBypass && (
              <g>
                <path
                  d="M 100 80 Q 400 10 700 80"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeDasharray="6 6"
                  opacity="0.8"
                />
                <text x="400" y="32" fill="#34d399" fontSize="11" fontWeight="bold" textAnchor="middle">
                  NH-160 Expressway Bypass (Saves ~14 min)
                </text>
              </g>
            )}

            {/* Main Corridor Path Segment (City Exit -> APMC Mandi -> State Highway) */}
            {/* Segment 1: City Exit (Green) */}
            <path d="M 100 80 L 300 80" fill="none" stroke="#10b981" strokeWidth="8" strokeLinecap="round" />

            {/* Segment 2: APMC Mandi Junction (Congestion Zone) */}
            <path
              d="M 300 80 L 520 80"
              fill="none"
              stroke={isCongested ? '#f43f5e' : isModerate ? '#f59e0b' : '#10b981'}
              strokeWidth="10"
              strokeLinecap="round"
            />

            {/* Segment 3: Highway Approach (Green) */}
            <path d="M 520 80 L 700 80" fill="none" stroke="#10b981" strokeWidth="8" strokeLinecap="round" />

            {/* Heatmap Hotspot Glow around Mandi Junction */}
            {showHeatmap && (isCongested || isModerate) && (
              <circle
                cx="410"
                cy="80"
                r="45"
                fill={isCongested ? 'rgba(244,63,94,0.25)' : 'rgba(245,158,11,0.25)'}
                className="animate-ping"
              />
            )}

            {/* Origin Pin */}
            <g transform="translate(100, 80)">
              <circle r="12" fill="#047857" stroke="#ffffff" strokeWidth="2" />
              <text x="0" y="4" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle">O</text>
              <text x="0" y="30" fill="#e2e8f0" fontSize="11" fontWeight="bold" textAnchor="middle">{originCode}</text>
            </g>

            {/* APMC Mandi Stop Pin */}
            <g transform="translate(410, 80)">
              <circle r="10" fill={isCongested ? '#e11d48' : '#d97706'} stroke="#ffffff" strokeWidth="2" />
              <text x="0" y="28" fill="#cbd5e1" fontSize="10" fontWeight="bold" textAnchor="middle">APMC Yard</text>
            </g>

            {/* Destination Pin */}
            <g transform="translate(700, 80)">
              <circle r="12" fill="#d97706" stroke="#ffffff" strokeWidth="2" />
              <text x="0" y="4" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle">D</text>
              <text x="0" y="30" fill="#e2e8f0" fontSize="11" fontWeight="bold" textAnchor="middle">{destCode}</text>
            </g>

            {/* Animated Live Moving MSRTC Bus Icon */}
            {(() => {
              const busX = 100 + (progress / 100) * 600;
              const busY = 80;
              return (
                <g transform={`translate(${busX}, ${busY})`} className="transition-transform duration-75">
                  {/* Bus Shadow */}
                  <circle r="16" fill="rgba(16, 185, 129, 0.4)" className="animate-pulse" />
                  {/* Bus Body */}
                  <rect x="-18" y="-12" width="36" height="24" rx="6" fill="#047857" stroke="#ffffff" strokeWidth="2" />
                  {/* Bus Windshield */}
                  <rect x="8" y="-8" width="6" height="16" rx="2" fill="#38bdf8" />
                  <text x="-4" y="4" fill="#ffffff" fontSize="9" fontWeight="bold">BUS</text>

                  {/* Top Floating Badge above Bus */}
                  <g transform="translate(0, -22)">
                    <rect x="-35" y="-12" width="70" height="16" rx="4" fill="#0f172a" stroke="#10b981" strokeWidth="1" />
                    <text x="0" y="0" fill="#34d399" fontSize="9" fontWeight="black" textAnchor="middle">
                      MH-19-MSRTC
                    </text>
                  </g>
                </g>
              );
            })()}
          </svg>
        </div>

        {/* Simulation Playback Control Bar */}
        <div className="relative z-10 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? 'Pause Simulation' : 'Play Live Route ▶'}
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>

          {/* Speed Selectors */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {[1, 2, 5].map((speed) => (
              <button
                key={speed}
                onClick={() => setSimSpeed(speed)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  simSpeed === speed ? 'bg-emerald-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Route Progress Slider */}
          <div className="flex-1 min-w-[150px] flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-bold">Progress:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <span className="text-xs font-mono font-bold text-emerald-400 w-10 text-right">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * TomTom Traffic Navigator Component with Interactive Simulation Engine
 */
export const TomTomTrafficView = () => {
  const [originCode, setOriginCode] = useState('KPG-DEPOT');
  const [destCode, setDestCode] = useState('SHIRDI');
  const [departureTime, setDepartureTime] = useState('08:00');
  const [busStops, setBusStops] = useState(DEFAULT_BUS_STOPS);
  const [trafficData, setTrafficData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [simScenario, setSimScenario] = useState('live'); // 'live' | 'morning_free' | 'mandi_rush' | 'evening_jam'

  useEffect(() => {
    getBusStops().then((res) => {
      if (res && res.stops && res.stops.length > 0) {
        setBusStops(res.stops);
      }
    }).catch(() => {});
  }, []);

  const fetchTraffic = async (overrideTime) => {
    setLoading(true);
    try {
      const timeToUse = overrideTime || departureTime;
      const data = await getTomTomTraffic({ originCode, destCode, departureTime: timeToUse });
      setTrafficData(data);
    } catch (err) {
      console.error('Failed to fetch TomTom traffic:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTraffic();
  }, [originCode, destCode, departureTime]);

  const handleApplyScenario = (scenario) => {
    setSimScenario(scenario);
    let time = '08:00';
    if (scenario === 'morning_free') time = '06:00';
    if (scenario === 'mandi_rush') time = '08:30';
    if (scenario === 'evening_jam') time = '18:00';
    setDepartureTime(time);
    fetchTraffic(time);
  };

  const getCongestionBadge = (level) => {
    switch (level) {
      case 'heavy':
        return { label: 'Heavy Congestion', bg: 'bg-rose-100 text-rose-900 border-rose-300', dot: 'bg-rose-600' };
      case 'moderate':
        return { label: 'Moderate Traffic', bg: 'bg-amber-100 text-amber-900 border-amber-300', dot: 'bg-amber-600' };
      default:
        return { label: 'Free Flow / Clear', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300', dot: 'bg-emerald-600' };
    }
  };

  const badge = getCongestionBadge(trafficData?.congestionLevel);

  return (
    <div className="space-y-6">
      {/* Route & Time Selection Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-emerald-700" />
            <h2 className="font-display text-lg font-bold text-slate-900">TomTom Live Corridor Navigator</h2>
          </div>
          <button
            onClick={() => fetchTraffic()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700 bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>
        </div>

        {/* Dynamic Depot / Bus Stop Selectors */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Origin Bus Depot / Stop</label>
            <select
              value={originCode}
              onChange={(e) => setOriginCode(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {busStops.map((stop) => (
                <option key={`tom-orig-${stop.code}`} value={stop.code}>
                  {stop.name} {stop.nameMr ? `(${stop.nameMr})` : ''} [{stop.code}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Destination Bus Depot / Stop</label>
            <select
              value={destCode}
              onChange={(e) => setDestCode(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {busStops.map((stop) => (
                <option key={`tom-dest-${stop.code}`} value={stop.code}>
                  {stop.name} {stop.nameMr ? `(${stop.nameMr})` : ''} [{stop.code}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Departure Schedule Time</label>
            <input
              type="time"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Traffic Simulation Controls */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Sliders className="h-4 w-4 text-emerald-700" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">TomTom Traffic Simulation Controls</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleApplyScenario('morning_free')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                simScenario === 'morning_free'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              🟢 Early Morning Express (06:00 AM Clear)
            </button>

            <button
              onClick={() => handleApplyScenario('mandi_rush')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                simScenario === 'mandi_rush'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              🟡 Mandi Rush Hour (08:30 AM Moderate)
            </button>

            <button
              onClick={() => handleApplyScenario('evening_jam')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                simScenario === 'evening_jam'
                  ? 'bg-rose-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              🔴 Pilgrim & Commuter Peak (06:00 PM Congested)
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Map & Route Simulator */}
      <TomTomTrafficMapSimulator
        originCode={originCode}
        destCode={destCode}
        trafficData={trafficData}
      />

      {/* Traffic Summary Cards */}
      {trafficData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
              <span>TomTom Delay</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] ${badge.bg}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                {badge.label}
              </span>
            </div>
            <p className="mt-3 font-display text-2xl sm:text-3xl font-black text-slate-900">
              +{trafficData.trafficDelayMin} min <span className="text-xs text-slate-400 font-normal">delay</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">Free Flow: {trafficData.freeFlowTimeMin} min</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-500">Estimated Travel Time</p>
            <p className="mt-3 font-display text-2xl sm:text-3xl font-black text-emerald-700">
              {trafficData.travelTimeMin} <span className="text-sm font-bold">mins</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">{trafficData.distanceKm} km route distance</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-500">Avg Corridor Speed</p>
            <p className="mt-3 font-display text-2xl sm:text-3xl font-black text-slate-900">
              {trafficData.avgSpeedKmH || 42} <span className="text-sm font-bold">km/h</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">Speed Index: {trafficData.speedMultiplier}x</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-500">TomTom Telemetry Engine</p>
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-900 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
              <Zap className="h-3.5 w-3.5 text-amber-600" />
              {trafficData.provider === 'tomtom_live' ? 'TomTom Live API' : 'TomTom Traffic Model'}
            </div>
            <p className="text-[11px] text-slate-500 mt-2 font-medium">Real-Time Routing & Flow</p>
          </div>
        </div>
      )}

      {/* Corridor Segment Breakdown & Bypass Comparison */}
      {trafficData && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Segment breakdown */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <Activity className="h-5 w-5 text-emerald-700" />
              <h3>Corridor Segment Traffic Telemetry</h3>
            </div>
            {trafficData.segments && trafficData.segments.length > 0 ? (
              <div className="space-y-3">
                {trafficData.segments.map((seg, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{seg.name}</p>
                      <p className="text-slate-500 font-medium">{seg.lengthKm} km • Avg Speed {seg.speedKmH} km/h</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-md font-extrabold ${
                      seg.status === 'heavy' ? 'bg-rose-100 text-rose-800' : seg.status === 'moderate' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      +{seg.delayMin}m delay
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Standard corridor segment data loaded.</p>
            )}
          </div>

          {/* Bypass & Optimal Advice */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 space-y-4">
            <div className="flex items-center gap-2 text-emerald-900 font-bold">
              <Compass className="h-5 w-5 text-emerald-700" />
              <h3>TomTom Driver Optimal Dispatch Advice</h3>
            </div>

            <p className="text-xs text-emerald-950 leading-relaxed font-medium">
              {trafficData.trafficDelayMin > 8 ? (
                <span>⚠️ <strong>Bottleneck Alert:</strong> High congestion near Mandi / Junction. {trafficData.optimalDepartureWindow}</span>
              ) : (
                <span>✅ <strong>Optimal Corridor Conditions:</strong> Excellent traffic flow. Bus schedule can proceed on time with optimum fuel efficiency.</span>
              )}
            </p>

            {trafficData.bypassOption && (
              <div className="mt-3 p-3 bg-white/90 rounded-xl border border-emerald-300 text-xs space-y-1">
                <p className="font-bold text-emerald-900">{trafficData.bypassOption.name}</p>
                <p className="text-slate-700 font-medium">
                  Distance: {trafficData.bypassOption.distanceKm} km | Est Time: {trafficData.bypassOption.travelTimeMin} mins
                </p>
                {trafficData.bypassOption.savesTimeMin > 0 && (
                  <span className="inline-block text-[11px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded mt-1">
                    ⚡ Saves {trafficData.bypassOption.savesTimeMin} minutes over congested main corridor
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TomTomTrafficView;
