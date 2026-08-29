import React, { useState } from 'react';
import { Truck, MapPin, ChevronDown, Snowflake, Save, X, Zap, BatteryCharging, Gauge } from 'lucide-react';
import { useT } from '../../i18n/useT';
import { addFleetVehicle } from '../../services/api';
import { Field } from '../../design/primitives/Field';
import { ChoiceGrid } from '../../design/primitives/ChoiceGrid';
import { Button } from '../../design/primitives/Button';
import { BASE_LOCATIONS } from './baseLocations';

const VEHICLE_TYPES = ['E-Pickup', 'Refrigerated Van', 'Heavy Freighter', 'Mini Truck'];

const EMPTY = {
  vehicleNo: '', driverName: '', driverPhone: '',
  vehicleType: 'E-Pickup', capacityKg: '1500', ratePerKm: '42',
  isRefrigerated: 'no', baseId: BASE_LOCATIONS[0].id,
  batteryCapacityKwh: '40', currentSoc: '65', maxRangeKm: '180',
};

/**
 * Adds a truck to the fleet.
 */
export const AddVehicleForm = ({ onDone, onCancel }) => {
  const { t } = useT();
  const [draft, setDraft] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const update = (event) =>
    setDraft((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const base = BASE_LOCATIONS.find((b) => b.id === draft.baseId) || BASE_LOCATIONS[0];
    try {
      await addFleetVehicle({
        vehicleNo: draft.vehicleNo,
        driverName: draft.driverName,
        driverPhone: draft.driverPhone,
        vehicleType: draft.vehicleType,
        capacityKg: Number(draft.capacityKg),
        ratePerKm: Number(draft.ratePerKm),
        isRefrigerated: draft.isRefrigerated === 'yes',
        baseLocation: base.label,
        baseCoords: base.coordinates,
        batteryCapacityKwh: draft.vehicleType === 'E-Pickup' ? Number(draft.batteryCapacityKwh) : null,
        currentSoc: draft.vehicleType === 'E-Pickup' ? Number(draft.currentSoc) : null,
        maxRangeKm: draft.vehicleType === 'E-Pickup' ? Number(draft.maxRangeKm) : null,
      });
      setDraft(EMPTY);
      await onDone();
    } catch (err) {
      setError(err?.response?.data?.message || t('dispatch.addVehicleFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="detail-enter space-y-4 border-2 border-ink bg-white p-4">
      {error && <p className="notice notice-bad" role="alert">{error}</p>}

      <Field
        label={t('dispatch.vehicleNumber')} icon={Truck} name="vehicleNo"
        value={draft.vehicleNo} onChange={update} placeholder="MH 15 EV 8821" required
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t('dispatch.driverName')} name="driverName"
          value={draft.driverName} onChange={update} required
        />
        <Field
          label={t('dispatch.driverPhone')} name="driverPhone" type="tel"
          value={draft.driverPhone} onChange={update} placeholder="+91 98230 11223"
        />
      </div>

      <div>
        <label className="field-label" htmlFor="vehicle-type">{t('dispatch.vehicleType')}</label>
        <div className="relative flex items-center">
          <Truck className="pointer-events-none absolute left-3.5 h-5 w-5 text-ink-faint" strokeWidth={2.25} aria-hidden="true" />
          <select
            id="vehicle-type" name="vehicleType" value={draft.vehicleType} onChange={update}
            className="field field-icon cursor-pointer appearance-none pr-11"
          >
            {VEHICLE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 h-5 w-5 text-ink" strokeWidth={2.5} aria-hidden="true" />
        </div>
      </div>

      {/* EV Battery Spec inputs when vehicleType is E-Pickup */}
      {draft.vehicleType === 'E-Pickup' && (
        <div className="p-3 bg-emerald-50 border-2 border-emerald-300 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
            <Zap className="h-4 w-4 text-emerald-700 fill-emerald-700" />
            <span>EV Battery & Range Specifications</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field
              label="Battery Pack (kWh)" icon={BatteryCharging} type="number" name="batteryCapacityKwh"
              value={draft.batteryCapacityKwh} onChange={update} placeholder="40" min="10" required
            />

            <Field
              label="Initial Battery % (SoC)" icon={Zap} type="number" name="currentSoc"
              value={draft.currentSoc} onChange={update} placeholder="65" min="5" max="100" required
            />

            <Field
              label="Max Single-Charge (km)" icon={Gauge} type="number" name="maxRangeKm"
              value={draft.maxRangeKm} onChange={update} placeholder="180" min="20" required
            />
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t('dispatch.capacity')} type="number" inputMode="numeric" name="capacityKg"
          value={draft.capacityKg} onChange={update} placeholder="1500" min="1" required
        />
        <Field
          label={t('dispatch.ratePerKm')} type="number" inputMode="numeric" name="ratePerKm"
          value={draft.ratePerKm} onChange={update} placeholder="42" min="1" required
        />
      </div>

      <ChoiceGrid
        label={t('dispatch.isCold')} columns={2} value={draft.isRefrigerated}
        onChange={(next) => setDraft((current) => ({ ...current, isRefrigerated: next }))}
        options={[
          { id: 'yes', label: t('common.yes'), icon: Snowflake },
          { id: 'no', label: t('common.no') },
        ]}
      />

      <div>
        <label className="field-label" htmlFor="vehicle-base">{t('dispatch.base')}</label>
        <div className="relative flex items-center">
          <MapPin className="pointer-events-none absolute left-3.5 h-5 w-5 text-ink-faint" strokeWidth={2.25} aria-hidden="true" />
          <select
            id="vehicle-base" name="baseId" value={draft.baseId} onChange={update}
            className="field field-icon cursor-pointer appearance-none pr-11"
          >
            {BASE_LOCATIONS.map((base) => (
              <option key={base.id} value={base.id}>{base.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 h-5 w-5 text-ink" strokeWidth={2.5} aria-hidden="true" />
        </div>
        <p className="mt-1.5 text-sm text-ink-soft">{t('dispatch.baseWhy')}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="secondary" icon={X} onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" icon={Save} busy={busy}>{t('dispatch.addVehicle')}</Button>
      </div>
    </form>
  );
};

export default AddVehicleForm;
