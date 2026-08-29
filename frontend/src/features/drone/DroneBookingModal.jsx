import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { estimateDroneMission, dispatchDroneMission } from '../../services/apiV2';

/**
 * DroneBookingModal — Express booking with side-by-side road vs air comparison.
 * Matches the rate-board design system (paper/ink/forest/turmeric).
 */
export const DroneBookingModal = ({ isOpen, onClose, hubs = [], onMissionLaunched }) => {
  const [originHubId, setOriginHubId] = useState('');
  const [destHubId, setDestHubId] = useState('');
  const [description, setDescription] = useState('Organic Trichoderma Bio-Fungicide');
  const [weightKg, setWeightKg] = useState(4.5);
  const [intermodal, setIntermodal] = useState(true);

  const [loading, setLoading] = useState(false);
  const [estimation, setEstimation] = useState(null);
  const [launched, setLaunched] = useState(false);

  useEffect(() => {
    if (hubs?.length >= 2) {
      if (!originHubId) {
        const p = hubs.find(h => h.hubCode === 'DH-POHEGAON') || hubs[1];
        setOriginHubId(p._id || p.hubCode);
      }
      if (!destHubId) {
        const d = hubs.find(h => h.hubCode === 'DH-KPG-DEPOT') || hubs[0];
        setDestHubId(d._id || d.hubCode);
      }
    }
  }, [hubs, originHubId, destHubId]);

  useEffect(() => {
    if (originHubId && destHubId && isOpen) handleEstimate();
  }, [originHubId, destHubId, weightKg, isOpen]);

  const handleEstimate = async () => {
    try {
      const res = await estimateDroneMission({
        originHubId, destHubId,
        cargo: { description, weightKg: parseFloat(weightKg) || 4.5, category: 'emergency_input' },
      });
      if (res.success) setEstimation(res);
    } catch (err) {
      console.warn('Estimate notice:', err.message);
    }
  };

  const handleDispatch = async () => {
    setLoading(true);
    try {
      const res = await dispatchDroneMission({
        originHubId, destHubId,
        cargo: { description, weightKg: parseFloat(weightKg) || 4.5, category: 'emergency_input' },
        intermodal: { isConnectingToBus: intermodal, destinationMandi: 'Nashik APMC' },
      });
      if (res.success) {
        setLaunched(true);
        if (onMissionLaunched) onMissionLaunched(res.mission || res);
        setTimeout(() => { setLaunched(false); onClose(); }, 1800);
      }
    } catch (err) {
      console.warn('Dispatch notice:', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const comp = estimation?.comparison;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(20,37,26,0.6)' }}>
      <div className="relative w-full max-w-xl rounded-xl border-2 overflow-hidden" style={{ borderColor: 'var(--ink)', background: '#fff' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b-2" style={{ borderColor: 'var(--ink)' }}>
          <div>
            <h3 className="font-display text-lg" style={{ color: 'var(--ink)' }}>Book Drone Express</h3>
            <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>Rural first-mile · Under 15 minutes</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="h-5 w-5" style={{ color: 'var(--ink-faint)' }} /></button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Route Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="eyebrow block mb-1">Origin Pad</label>
              <select value={originHubId} onChange={e => setOriginHubId(e.target.value)} className="field" style={{ minHeight: '2.5rem', fontSize: '0.8rem' }}>
                {hubs.map(h => <option key={h._id || h.hubCode} value={h._id || h.hubCode}>{h.name}</option>)}
              </select>
            </div>
            <div>
              <label className="eyebrow block mb-1">Destination</label>
              <select value={destHubId} onChange={e => setDestHubId(e.target.value)} className="field" style={{ minHeight: '2.5rem', fontSize: '0.8rem' }}>
                {hubs.map(h => <option key={h._id || h.hubCode} value={h._id || h.hubCode}>{h.name}</option>)}
              </select>
            </div>
          </div>

          {/* Cargo */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="eyebrow block mb-1">Cargo</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="field" style={{ minHeight: '2.5rem', fontSize: '0.8rem' }} />
            </div>
            <div>
              <label className="eyebrow block mb-1">Weight (kg)</label>
              <input type="number" step="0.5" min="0.5" max="15" value={weightKg} onChange={e => setWeightKg(e.target.value)} className="field" style={{ minHeight: '2.5rem', fontSize: '0.8rem' }} />
            </div>
          </div>

          {/* Multimodal toggle */}
          <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer" style={{ background: 'var(--paper)' }}>
            <input type="checkbox" checked={intermodal} onChange={e => setIntermodal(e.target.checked)} className="h-4 w-4 accent-green-700" />
            <div>
              <span className="text-xs font-bold" style={{ color: 'var(--ink)' }}>Connect to MSRTC Bus at Depot</span>
              <span className="text-[11px] block" style={{ color: 'var(--ink-faint)' }}>Transfer cargo to bus for Nashik APMC</span>
            </div>
          </label>

          {/* Comparison Table */}
          {estimation && (
            <div className="border-2 rounded-lg overflow-hidden" style={{ borderColor: 'var(--rule)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--paper)' }}>
                    <th className="text-left px-3 py-2 eyebrow" />
                    <th className="text-right px-3 py-2 eyebrow">🚜 Road</th>
                    <th className="text-right px-3 py-2 eyebrow" style={{ color: 'var(--forest)' }}>🛩️ Drone</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t" style={{ borderColor: 'var(--rule)' }}>
                    <td className="px-3 py-2 font-semibold" style={{ color: 'var(--ink)' }}>Duration</td>
                    <td className="px-3 py-2 text-right font-bold" style={{ color: 'var(--ink)' }}>{comp?.roadDurationMin || 48} min</td>
                    <td className="px-3 py-2 text-right font-bold" style={{ color: 'var(--forest)' }}>{comp?.flightDurationMin || 11} min</td>
                  </tr>
                  <tr className="border-t" style={{ borderColor: 'var(--rule)' }}>
                    <td className="px-3 py-2 font-semibold" style={{ color: 'var(--ink)' }}>Cost</td>
                    <td className="px-3 py-2 text-right font-bold" style={{ color: 'var(--ink)' }}>₹{comp?.roadCostEstimatedInr || 350}</td>
                    <td className="px-3 py-2 text-right font-bold" style={{ color: 'var(--forest)' }}>₹{comp?.droneCostInr || 154}</td>
                  </tr>
                  <tr className="border-t" style={{ borderColor: 'var(--rule)' }}>
                    <td className="px-3 py-2 font-semibold" style={{ color: 'var(--ink)' }}>Produce Damage</td>
                    <td className="px-3 py-2 text-right text-red-600 font-bold">High Risk</td>
                    <td className="px-3 py-2 text-right font-bold" style={{ color: 'var(--forest)' }}>Zero</td>
                  </tr>
                </tbody>
              </table>
              <div className="px-3 py-2 text-xs text-center font-bold" style={{ background: '#f0fdf4', color: 'var(--forest)' }}>
                Save {comp?.percentTimeSaved || 64}% time · Save ₹{comp?.costSavingsInr || 196}
              </div>
            </div>
          )}

          {launched && (
            <div className="rounded-lg p-3 text-xs font-bold text-center" style={{ background: '#f0fdf4', color: 'var(--forest)', border: '2px solid var(--forest)' }}>
              ✓ Mission authorized — drone cleared for takeoff
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t-2" style={{ borderColor: 'var(--rule)', background: 'var(--paper)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-bold border-2" style={{ borderColor: 'var(--rule)', color: 'var(--ink-faint)' }}>
            Cancel
          </button>
          <button onClick={handleDispatch} disabled={loading || launched}
            className="px-5 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50"
            style={{ background: 'var(--forest)' }}
          >
            {loading ? 'Authorizing…' : 'Confirm & Launch'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DroneBookingModal;
