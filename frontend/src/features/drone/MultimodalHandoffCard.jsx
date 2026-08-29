import React from 'react';

/**
 * MultimodalHandoffCard — visualises the Drone → Depot → Bus corridor.
 * Clean horizontal step timeline, no gradients.
 */
export const MultimodalHandoffCard = ({
  originName = 'Pohegaon Panchayat Pad',
  depotName = 'Kopargaon ST Depot',
  destinationName = 'Nashik APMC Mandi',
  droneDurationMin = 11,
  busDurationMin = 65,
  transferWindowMin = 18,
  busCode = 'MH-19-BUS-4288',
  cargoWeightKg = 4.5,
}) => {
  const totalMin = droneDurationMin + transferWindowMin + busDurationMin;

  const steps = [
    { label: 'Air Corridor', sublabel: originName, time: `${droneDurationMin} min`, icon: '🛩️', accent: 'var(--forest)' },
    { label: 'Hub Transfer', sublabel: depotName, time: `${transferWindowMin} min buffer`, icon: '📦', accent: '#EDBF4F' },
    { label: 'Bus Line-Haul', sublabel: destinationName, time: `${busDurationMin} min`, icon: '🚌', accent: '#3B6E4F' },
  ];

  return (
    <div className="rounded-xl border-2" style={{ borderColor: 'var(--rule)', background: '#fff' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b-2" style={{ borderColor: 'var(--ink)' }}>
        <span className="eyebrow">Multimodal Corridor</span>
        <span className="text-xs font-bold" style={{ color: 'var(--forest)' }}>
          {totalMin} min total · ₹189 combined
        </span>
      </div>

      {/* Step Timeline */}
      <div className="px-4 py-5">
        <div className="flex items-start">
          {steps.map((step, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center text-center flex-1">
                {/* Circle */}
                <div
                  className="flex items-center justify-center h-10 w-10 rounded-full text-lg border-2"
                  style={{ borderColor: step.accent, background: '#faf8f0' }}
                >
                  {step.icon}
                </div>
                <div className="mt-2">
                  <p className="text-xs font-bold" style={{ color: 'var(--ink)' }}>{step.label}</p>
                  <p className="text-[11px] mt-0.5 font-semibold" style={{ color: step.accent }}>{step.time}</p>
                  <p className="text-[10px] mt-0.5 max-w-[140px]" style={{ color: 'var(--ink-faint)' }}>{step.sublabel}</p>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className="flex items-center pt-4 px-1 flex-shrink-0">
                  <div className="h-0.5 w-8" style={{ background: 'var(--rule)' }} />
                  <span className="text-xs mx-1" style={{ color: 'var(--ink-faint)' }}>→</span>
                  <div className="h-0.5 w-8" style={{ background: 'var(--rule)' }} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Comparison footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t text-xs" style={{ borderColor: 'var(--rule)', background: 'var(--paper)' }}>
        <span style={{ color: 'var(--ink-faint)' }}>
          vs traditional road dispatch: <strong style={{ color: 'var(--ink)' }}>3.5 hrs · ₹750</strong>
        </span>
        <span className="font-bold" style={{ color: 'var(--forest)' }}>
          75% faster · 75% cheaper
        </span>
      </div>
    </div>
  );
};

export default MultimodalHandoffCard;
