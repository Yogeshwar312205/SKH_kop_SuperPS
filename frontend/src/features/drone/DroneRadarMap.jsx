import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * DroneRadarMap — Kopargaon Taluka aerial corridor visualisation.
 *
 * A clean SVG map that shows certified pads, the active flight corridor,
 * and a smoothly animated drone marker during simulation.  No generic
 * gradients — uses the app's forest/turmeric/paper palette.
 */

// ─── Geographic projection ─────────────────────────────────────────────
const BOUNDS = { minLng: 74.35, maxLng: 74.55, minLat: 19.72, maxLat: 19.96 };

const project = (lng, lat, w = 720, h = 420) => ({
  x: ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * (w - 60) + 30,
  y: (1 - (lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * (h - 60) + 30,
});

// ─── Hub type → colour mapping ──────────────────────────────────────────
const HUB_COLOURS = {
  depot_hub: '#EDBF4F',   // turmeric
  village_pad: '#18532B',  // forest
  kvk_lab_pad: '#6B4E2E',  // earth
  apmc_pad: '#3B6E4F',     // sage
};

export const DroneRadarMap = ({ hubs = [], liveTelemetry = null, activeMission = null, isSimulating = false, simProgress = 0 }) => {
  const [selected, setSelected] = useState(null);
  const W = 720, H = 420;

  const originHub = hubs.find(h => h.hubCode === (activeMission?.originHubCode || 'DH-POHEGAON')) || hubs[1];
  const destHub   = hubs.find(h => h.hubCode === (activeMission?.destHubCode   || 'DH-KPG-DEPOT')) || hubs[0];

  const originPt = originHub ? project(originHub.location.coordinates[0], originHub.location.coordinates[1], W, H) : { x: 280, y: 120 };
  const destPt   = destHub   ? project(destHub.location.coordinates[0],   destHub.location.coordinates[1],   W, H) : { x: 490, y: 250 };

  // Drone position: from live telemetry, or interpolated from simProgress
  let dronePt = originPt;
  if (liveTelemetry?.coordinates) {
    dronePt = project(liveTelemetry.coordinates[0], liveTelemetry.coordinates[1], W, H);
  } else if (isSimulating) {
    const t = Math.min(simProgress, 1);
    dronePt = { x: originPt.x + (destPt.x - originPt.x) * t, y: originPt.y + (destPt.y - originPt.y) * t };
  }

  // Shirdi Airport NFZ
  const shirdiPt = project(74.3792, 19.6897, W, H);

  return (
    <div className="rounded-xl border-2 border-rule overflow-hidden" style={{ background: '#faf8f0' }}>
      {/* Map Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b-2" style={{ borderColor: 'var(--ink)', background: 'var(--paper)' }}>
        <span className="eyebrow" style={{ letterSpacing: '0.1em' }}>Kopargaon Air Corridor Map</span>
        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--ink-faint)' }}>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: '#18532B' }} /> Village Pad
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: '#EDBF4F' }} /> Depot
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: '#ef4444' }} /> No-Fly Zone
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 400 }}>
        {/* Subtle grid */}
        <defs>
          <pattern id="dMap-grid" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#d4cfc0" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#dMap-grid)" />

        {/* Godavari river */}
        <path d="M 80 180 Q 300 210 500 175 T 700 220" fill="none" stroke="#b8cfe0" strokeWidth="6" strokeLinecap="round" opacity="0.5" />
        <text x="620" y="235" fill="#7ca8c4" fontSize="9" fontFamily="sans-serif" fontWeight="600" opacity="0.7">Godavari</text>

        {/* Shirdi Airport No-Fly Zone */}
        <circle cx={shirdiPt.x} cy={shirdiPt.y} r={48} fill="#ef4444" fillOpacity="0.06" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />
        <circle cx={shirdiPt.x} cy={shirdiPt.y} r="3.5" fill="#ef4444" />
        <text x={shirdiPt.x + 8} y={shirdiPt.y + 4} fill="#dc2626" fontSize="9" fontFamily="sans-serif" fontWeight="600">
          Shirdi Airport · 5 km No-Fly
        </text>

        {/* Flight corridor */}
        {originPt && destPt && (
          <g>
            <line x1={originPt.x} y1={originPt.y} x2={destPt.x} y2={destPt.y} stroke="#18532B" strokeWidth="2.5" strokeDasharray="8,5" opacity="0.35" />
            {isSimulating && (
              <line
                x1={originPt.x} y1={originPt.y} x2={dronePt.x} y2={dronePt.y}
                stroke="#18532B" strokeWidth="2.5" opacity="0.8"
              />
            )}
          </g>
        )}

        {/* Hubs */}
        {hubs.map(hub => {
          const pt = project(hub.location.coordinates[0], hub.location.coordinates[1], W, H);
          const isEndpoint = hub.hubCode === originHub?.hubCode || hub.hubCode === destHub?.hubCode;
          const fill = HUB_COLOURS[hub.hubType] || '#5F6E63';
          const isSel = selected?.hubCode === hub.hubCode;

          return (
            <g key={hub._id || hub.hubCode} className="cursor-pointer" onClick={() => setSelected(isSel ? null : hub)}>
              {isEndpoint && <circle cx={pt.x} cy={pt.y} r="14" fill="none" stroke={fill} strokeWidth="1.5" strokeDasharray="3,3" opacity="0.5" />}
              {isSel && <circle cx={pt.x} cy={pt.y} r="16" fill="none" stroke={fill} strokeWidth="2" />}
              <circle cx={pt.x} cy={pt.y} r="5.5" fill={fill} />
              <circle cx={pt.x} cy={pt.y} r="2" fill="#fff" />
              <text x={pt.x} y={pt.y - 10} textAnchor="middle" fill="var(--ink)" fontSize="9" fontFamily="sans-serif" fontWeight="700">
                {hub.name.split(' ').slice(0, 2).join(' ')}
              </text>
            </g>
          );
        })}

        {/* Drone marker */}
        {isSimulating && (
          <g transform={`translate(${dronePt.x}, ${dronePt.y})`}>
            <circle cx="0" cy="0" r="18" fill="#18532B" fillOpacity="0.08">
              <animate attributeName="r" values="12;22;12" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="fill-opacity" values="0.12;0.02;0.12" dur="1.5s" repeatCount="indefinite" />
            </circle>
            {/* Drone body */}
            <polygon points="0,-8 6,4 -6,4" fill="#18532B" stroke="#fff" strokeWidth="1" />
            <circle cx="0" cy="0" r="2.5" fill="#EDBF4F" />
          </g>
        )}
      </svg>

      {/* Selected hub info */}
      {selected && (
        <div className="px-4 py-2.5 border-t-2 text-xs flex items-center justify-between" style={{ borderColor: 'var(--rule)', background: 'var(--paper)' }}>
          <div>
            <strong style={{ color: 'var(--ink)' }}>{selected.name}</strong>
            <span className="ml-2" style={{ color: 'var(--ink-faint)' }}>{selected.nameMr}</span>
          </div>
          <div className="flex items-center gap-3" style={{ color: 'var(--ink-faint)' }}>
            <span>Solar: {selected.hasSolarCharging ? '✓' : '—'}</span>
            <span>Elev: {selected.elevationMeters}m</span>
            <button onClick={() => setSelected(null)} className="ml-2 font-bold" style={{ color: 'var(--forest)' }}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DroneRadarMap;
