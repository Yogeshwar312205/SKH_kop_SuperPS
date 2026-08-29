import React, { useState } from 'react';
import { MapPin, Snowflake, Truck, Plus, CloudOff, RefreshCw, Zap, ShieldCheck, BatteryCharging } from 'lucide-react';
import { useT } from '../../i18n/useT';
import { useFleet } from './useFleet';
import { SectionHead } from '../../design/primitives/SectionHead';
import { Button } from '../../design/primitives/Button';
import { AddVehicleForm } from './AddVehicleForm';
import { CapacityBar } from './CapacityBar';
import { EvFleetSimulator } from './EvFleetSimulator';

const STATUS_KEYS = {
  Idle: 'dispatch.status.idle',
  Loading: 'dispatch.status.loading',
  'En route': 'dispatch.status.enRoute',
  Unavailable: 'dispatch.status.unavailable',
};

export const FleetScreen = () => {
  const { t, tCount, number, money } = useT();
  const { vehicles: registeredVehicles, loading, error, refresh } = useFleet();
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('vehicles'); // 'vehicles' | 'ev_optimizer'

  const totalCapacity = registeredVehicles.reduce((sum, v) => sum + (v.capacityKg || 0), 0);
  const totalLoad = registeredVehicles.reduce((sum, v) => sum + (v.currentLoadKg || 0), 0);

  return (
    <div className="space-y-6 pt-4 pb-4">
      <SectionHead
        level="screen"
        title={t('dispatch.fleetTitle')}
        note={t('dispatch.fleetNote', {
          free: number(totalCapacity - totalLoad),
          total: number(totalCapacity),
        })}
        action={
          <Button full={false} icon={Plus} onClick={() => setShowForm((v) => !v)}>
            {t('dispatch.addVehicle')}
          </Button>
        }
      />

      {/* Tab Switcher */}
      <div className="flex border-2 border-ink bg-white p-1 gap-1">
        <button
          onClick={() => setActiveTab('vehicles')}
          className={`flex-1 py-2.5 px-4 font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'vehicles' ? 'bg-ink text-white shadow-sm' : 'text-ink-soft hover:text-ink hover:bg-slate-100'
          }`}
        >
          <Truck className="h-4 w-4" />
          <span>Registered Fleet ({registeredVehicles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ev_optimizer')}
          className={`flex-1 py-2.5 px-4 font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'ev_optimizer' ? 'bg-emerald-700 text-white shadow-sm' : 'text-emerald-900 hover:bg-emerald-50'
          }`}
        >
          <Zap className="h-4 w-4 text-amber-400 fill-amber-400" />
          <span>EV Route & Battery Optimizer</span>
        </button>
      </div>

      {activeTab === 'ev_optimizer' ? (
        <EvFleetSimulator />
      ) : (
        <>
          {error && (
            <div className="border-2 border-terracotta-500 bg-terracotta-50 px-4 py-6 text-center">
              <CloudOff className="mx-auto h-8 w-8 text-terracotta-600" strokeWidth={2} aria-hidden="true" />
              <p className="mt-3 font-display text-2xl text-ink">{t('dispatch.fleetOffline')}</p>
              <div className="mx-auto mt-4 max-w-xs">
                <Button icon={RefreshCw} onClick={refresh}>{t('dispatch.retry')}</Button>
              </div>
            </div>
          )}

          {showForm && (
            <AddVehicleForm
              onDone={async () => { setShowForm(false); await refresh(); }}
              onCancel={() => setShowForm(false)}
            />
          )}

          {!error && !loading && registeredVehicles.length === 0 && !showForm && (
            <div className="border-2 border-ink bg-white px-4 py-10 text-center">
              <p className="font-display text-3xl text-ink-faint">{t('dispatch.fleetEmpty')}</p>
              <p className="mx-auto mt-2 max-w-prose text-base text-ink-soft">{t('dispatch.fleetEmptyWhy')}</p>
            </div>
          )}

          <div className="stagger space-y-3">
            {registeredVehicles.map((vehicle) => {
              const stops = vehicle.currentRoute || [];
              const committed = stops.filter((s) => s.kind !== 'depot').length;

              let running = vehicle.currentLoadKg || 0;
              let peak = running;
              for (const stop of stops) {
                running += stop.loadDeltaKg || 0;
                if (running > peak) peak = running;
              }

              const isEV = vehicle.vehicleType === 'E-Pickup';

              return (
                <article key={vehicle.id} className="border-2 border-ink bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="font-display text-2xl leading-none tnum text-ink">{vehicle.vehicleNo}</p>
                      {isEV && (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-extrabold px-2 py-0.5 rounded-full">
                          <Zap className="h-3.5 w-3.5 text-emerald-700 fill-emerald-700" />
                          E-Pickup (EV)
                        </span>
                      )}
                    </div>
                    <span
                      className={`border-2 border-ink px-2 py-1 text-sm font-bold leading-none ${
                        vehicle.status === 'En route' ? 'bg-turmeric-300 text-ink'
                          : vehicle.status === 'Unavailable' ? 'bg-white text-ink-soft'
                          : 'bg-forest-700 text-white'
                      }`}
                    >
                      {t(STATUS_KEYS[vehicle.status] || 'dispatch.status.idle')}
                    </span>
                  </div>

                  <div className="space-y-3 px-4 py-3.5 text-base text-ink">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">
                        {vehicle.vehicleType} · {vehicle.driverName}
                      </p>
                      {isEV && (
                        <button
                          onClick={() => setActiveTab('ev_optimizer')}
                          className="text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <BatteryCharging className="h-3.5 w-3.5 text-emerald-700" />
                          Simulate EV Route ➔
                        </button>
                      )}
                    </div>

                    <CapacityBar
                      capacityKg={vehicle.capacityKg}
                      currentLoadKg={vehicle.currentLoadKg || 0}
                      committedKg={peak - (vehicle.currentLoadKg || 0)}
                    />

                    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-soft">
                      <span className="tnum">{t('dispatch.ratePerKm')}: {money(vehicle.ratePerKm)}/km</span>
                      <span className="tnum">
                        {tCount('dispatch.stopsCommitted', committed)}
                      </span>
                    </p>

                    <p className="flex items-center gap-2 text-ink-soft">
                      <MapPin className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden="true" />
                      {stops[0]?.label || vehicle.baseLocation}
                      {vehicle.isRefrigerated && (
                        <span className="inline-flex items-center gap-1 border-2 border-forest-700 bg-forest-50 px-2 py-0.5 text-sm font-bold text-forest-700">
                          <Snowflake className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                          {t('dispatch.coldOk')}
                        </span>
                      )}
                    </p>

                    {!stops.length && (
                      <p className="flex items-start gap-2 border-2 border-terracotta-500 bg-terracotta-50 px-3 py-2 text-base text-terracotta-700">
                        <Truck className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                        {t('dispatch.reason.vehicleNoCoords')}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default FleetScreen;
