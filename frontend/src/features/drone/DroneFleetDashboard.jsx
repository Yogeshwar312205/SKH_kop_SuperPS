import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getDroneFleet, getDroneHubs, getDroneAnalytics, simulateDroneMission } from '../../services/apiV2';
import { DroneRadarMap } from './DroneRadarMap';
import { MultimodalHandoffCard } from './MultimodalHandoffCard';
import { DroneBookingModal } from './DroneBookingModal';
import { getSocket } from '../../services/socket';

/**
 * DroneFleetDashboard — the KrishiFly tab.
 *
 * Design: Matches the app's paper/ink/forest "rate board" system.
 * No dark-mode sci-fi gradients. Clean, data-first, prototype-ready.
 *
 * Simulation: Runs entirely client-side with a 30-second animated flight.
 * The drone interpolates from origin to destination with live telemetry
 * numbers (altitude, speed, battery drain, ETA) so the hackathon demo
 * looks like a real mission even without GPS hardware.
 */

// ─── Simulation config ────────────────────────────────────────────────
const SIM_DURATION_SEC = 30;
const SIM_CRUISE_ALT = 75;
const SIM_CRUISE_SPEED = 48;
const SIM_START_SOC = 92;

export const DroneFleetDashboard = () => {
  const [drones, setDrones] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  // ── Simulation state ──────────────────────────────────────────────
  const [simRunning, setSimRunning] = useState(false);
  const [simProgress, setSimProgress] = useState(0);     // 0 → 1
  const [simTelemetry, setSimTelemetry] = useState(null); // { altitude, speed, soc, eta, phase }
  const [simLog, setSimLog] = useState([]);
  const simTimer = useRef(null);

  useEffect(() => { loadData(); }, []);

  // Also listen for backend WebSocket telemetry if available
  useEffect(() => {
    const socket = getSocket();
    const onTel = (d) => {
      if (d.status === 'landing' || d.status === 'delivered') stopSim();
    };
    const onMsg = (d) => setSimLog(prev => [d.message, ...prev.slice(0, 4)]);
    socket.on('drone:telemetry', onTel);
    socket.on('drone:mission_status', onMsg);
    return () => { socket.off('drone:telemetry', onTel); socket.off('drone:mission_status', onMsg); };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [f, h] = await Promise.all([getDroneFleet(), getDroneHubs()]);
      if (f.drones) setDrones(f.drones);
      if (h.hubs) setHubs(h.hubs);
    } catch (e) { console.warn('Load notice:', e.message); }
    finally { setLoading(false); }
  };

  // ── Client-side flight simulation ────────────────────────────────
  const startSim = useCallback(() => {
    setSimRunning(true);
    setSimProgress(0);
    setSimLog(['Pre-flight checklist complete', 'DGCA Green Zone verified · Wind 12 km/h', 'Takeoff authorised']);

    const startedAt = Date.now();
    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const t = Math.min(elapsed / SIM_DURATION_SEC, 1);
      setSimProgress(t);

      // Determine flight phase
      let phase = 'Cruising', alt = SIM_CRUISE_ALT, spd = SIM_CRUISE_SPEED;
      if (t < 0.08) { phase = 'Climbing'; alt = Math.round(SIM_CRUISE_ALT * (t / 0.08)); spd = Math.round(SIM_CRUISE_SPEED * 0.6); }
      else if (t > 0.92) { phase = 'Descending'; alt = Math.round(SIM_CRUISE_ALT * ((1 - t) / 0.08)); spd = Math.round(SIM_CRUISE_SPEED * 0.4); }
      if (t >= 1) { phase = 'Landed'; alt = 0; spd = 0; }

      const soc = Math.round(SIM_START_SOC - (SIM_START_SOC - 72) * t);
      const eta = Math.max(0, Math.round(SIM_DURATION_SEC - elapsed));

      setSimTelemetry({ altitude: alt, speed: spd, soc, eta, phase });

      if (t >= 1) {
        setSimLog(prev => ['✓ Cargo delivered at Kopargaon ST Depot', ...prev.slice(0, 4)]);
        setSimRunning(false);
        return;
      }
      simTimer.current = requestAnimationFrame(tick);
    };
    simTimer.current = requestAnimationFrame(tick);

    // Also try triggering backend simulation (non-blocking)
    simulateDroneMission('DEMO-POHEGAON-KPG').catch(() => {});
  }, []);

  const stopSim = useCallback(() => {
    if (simTimer.current) cancelAnimationFrame(simTimer.current);
    setSimRunning(false);
  }, []);

  useEffect(() => () => { if (simTimer.current) cancelAnimationFrame(simTimer.current); }, []);

  // ── Formatters ───────────────────────────────────────────────────
  const socBar = (soc) => {
    const colour = soc > 50 ? 'var(--forest)' : soc > 25 ? '#EDBF4F' : '#dc2626';
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--rule)' }}>
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${soc}%`, background: colour }} />
        </div>
        <span className="text-xs font-bold tnum" style={{ color: colour, minWidth: 32, textAlign: 'right' }}>{soc}%</span>
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-6">
      {/* ─── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-3 pb-3 rule-strong">
        <div>
          <div className="furrow w-12 rounded mb-2" />
          <h1 className="font-display text-2xl" style={{ color: 'var(--ink)' }}>
            KrishiFly Drone Network
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ink-faint)' }}>
            Kopargaon taluka · 8 certified pads · Autonomous aerial first-mile
          </p>
        </div>
        <button onClick={() => setIsBookingOpen(true)}
          className="px-4 py-2.5 rounded-lg text-sm font-bold text-white"
          style={{ background: 'var(--forest)' }}
        >
          + Book Drone Express
        </button>
      </div>

      {/* ─── Key Metrics (rate-board style) ──────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-xl overflow-hidden border-2" style={{ borderColor: 'var(--ink)' }}>
        {[
          { label: 'Crop Value Protected', value: '₹5.84L', sub: 'pest outbreaks averted' },
          { label: 'Drone Owner Earnings', value: '₹218k', sub: 'dual-use midday cargo' },
          { label: 'Road Hours Saved', value: '412 hrs', sub: '11 min air vs 48 min road' },
          { label: 'Certified Pads', value: '8', sub: 'Namo Drone Didi network' },
        ].map((m, i) => (
          <div key={i} className="p-3.5" style={{ background: i % 2 === 0 ? '#fff' : 'var(--paper)' }}>
            <span className="eyebrow block">{m.label}</span>
            <p className="font-display text-xl mt-0.5" style={{ color: 'var(--forest)' }}>{m.value}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{m.sub}</p>
          </div>
        ))}
      </div>

      {/* ─── Main Content ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left: Fleet list ──────────────────────────────────── */}
        <div className="space-y-4">
          {/* Fleet card */}
          <div className="rounded-xl border-2 overflow-hidden" style={{ borderColor: 'var(--rule)', background: '#fff' }}>
            <div className="flex items-center justify-between px-4 py-2.5 border-b-2" style={{ borderColor: 'var(--ink)' }}>
              <span className="eyebrow">Kisan Drone Fleet ({drones.length})</span>
              <button onClick={loadData} className="text-xs font-bold" style={{ color: 'var(--forest)' }}>Refresh</button>
            </div>

            <div className="divide-y" style={{ borderColor: 'var(--rule)' }}>
              {drones.map(drone => {
                const soc = drone.battery?.currentSoc || 90;
                const isFlying = simRunning && drone.droneCode === 'KPG-DRONE-01';

                return (
                  <div key={drone._id || drone.droneCode} className="px-4 py-3" style={{ background: isFlying ? '#f0fdf4' : '#fff' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold" style={{ color: 'var(--ink)' }}>{drone.droneCode}</span>
                        <span className="text-[11px] ml-2" style={{ color: 'var(--ink-faint)' }}>{drone.name}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                        style={{
                          background: isFlying ? 'var(--forest)' : drone.status === 'charging' ? '#fef3c7' : '#f0fdf4',
                          color: isFlying ? '#fff' : drone.status === 'charging' ? '#92400e' : 'var(--forest)',
                        }}
                      >
                        {isFlying ? '● AIRBORNE' : drone.status?.toUpperCase() || 'IDLE'}
                      </span>
                    </div>

                    <div className="mt-2">{socBar(soc)}</div>

                    <div className="mt-2 grid grid-cols-2 gap-x-4 text-[10px]" style={{ color: 'var(--ink-faint)' }}>
                      <span>Payload: <strong style={{ color: 'var(--ink)' }}>{drone.maxPayloadKg} kg</strong></span>
                      <span>Range: <strong style={{ color: 'var(--ink)' }}>{drone.maxRangeKm} km</strong></span>
                      <span>Spray today: <strong style={{ color: 'var(--ink)' }}>{drone.dualUseStats?.sprayHoursToday}h</strong></span>
                      <span>Delivery: <strong style={{ color: 'var(--forest)' }}>{drone.dualUseStats?.deliveryHoursToday}h</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dual-use explainer */}
          <div className="rounded-xl border-2 p-4" style={{ borderColor: 'var(--forest)', background: '#f0fdf4' }}>
            <p className="text-xs font-bold mb-1" style={{ color: 'var(--forest)' }}>3× Drone Owner ROI</p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--ink)' }}>
              Agricultural spraying drones sit idle 9 AM – 5 PM. KrishiFly repurposes them for cargo, generating
              an extra <strong>₹1,450/day</strong> and paying off equipment loans <strong>18 months faster</strong>.
            </p>
          </div>
        </div>

        {/* ── Right: Map + Simulation + Handoff ─────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Simulation control bar */}
          <div className="rounded-xl border-2 p-4" style={{ borderColor: 'var(--rule)', background: '#fff' }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="eyebrow block">Flight Simulation</span>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                  Pohegaon Panchayat Pad → Kopargaon ST Depot · 5.87 km
                </p>
              </div>
              <button onClick={startSim} disabled={simRunning}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50 transition-opacity"
                style={{ background: simRunning ? 'var(--ink-faint)' : 'var(--forest)' }}
              >
                {simRunning ? '● Flight in Progress…' : '▶ Launch Simulation'}
              </button>
            </div>

            {/* Telemetry readout */}
            {simTelemetry && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--rule)' }}>
                {/* Progress bar */}
                <div className="h-1.5 w-full rounded-full overflow-hidden mb-3" style={{ background: 'var(--rule)' }}>
                  <div className="h-full rounded-full transition-all duration-200" style={{ width: `${simProgress * 100}%`, background: 'var(--forest)' }} />
                </div>

                <div className="grid grid-cols-5 gap-3 text-center">
                  {[
                    { label: 'Phase', value: simTelemetry.phase },
                    { label: 'Altitude', value: `${simTelemetry.altitude}m` },
                    { label: 'Speed', value: `${simTelemetry.speed} km/h` },
                    { label: 'Battery', value: `${simTelemetry.soc}%` },
                    { label: 'ETA', value: `${simTelemetry.eta}s` },
                  ].map((d, i) => (
                    <div key={i}>
                      <span className="eyebrow text-[9px] block">{d.label}</span>
                      <span className="font-display text-sm block mt-0.5" style={{ color: d.label === 'Phase' ? 'var(--forest)' : 'var(--ink)' }}>
                        {d.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Flight log */}
            {simLog.length > 0 && (
              <div className="mt-3 pt-2 border-t text-[11px] space-y-0.5" style={{ borderColor: 'var(--rule)', color: 'var(--ink-faint)' }}>
                {simLog.map((msg, i) => (
                  <div key={i} className={i === 0 ? 'font-bold' : ''} style={i === 0 ? { color: 'var(--forest)' } : {}}>
                    {msg}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Radar Map */}
          <DroneRadarMap
            hubs={hubs}
            isSimulating={simRunning}
            simProgress={simProgress}
            activeMission={{ originHubCode: 'DH-POHEGAON', destHubCode: 'DH-KPG-DEPOT' }}
          />

          {/* Multimodal Handoff */}
          <MultimodalHandoffCard
            originName="Pohegaon Panchayat Pad"
            depotName="Kopargaon ST Depot"
            destinationName="Nashik APMC Mandi"
            droneDurationMin={11}
            busDurationMin={65}
            transferWindowMin={18}
            busCode="MH-19-BUS-4288"
            cargoWeightKg={4.5}
          />
        </div>
      </div>

      {/* Booking Modal */}
      <DroneBookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        hubs={hubs}
        onMissionLaunched={() => { startSim(); }}
      />
    </div>
  );
};

export default DroneFleetDashboard;
