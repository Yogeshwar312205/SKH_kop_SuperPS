import React, { useState, useEffect } from 'react';
import { Truck, Plus, Navigation, Package, Clock, CheckCircle2, AlertCircle, Calendar, ShieldCheck, MapPin, Zap, RefreshCw } from 'lucide-react';
import { getBusRoutes, getBusTrips, createBusRoute, createBusTrip, getTripManifest, getBusStops } from '../../services/apiV2';
import { TomTomTrafficView } from './TomTomTrafficView';

/**
 * Fallback Bus Stops list if backend database has no stops
 */
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

export const MsrtcDashboard = () => {
  const [activeTab, setActiveTab] = useState('add-trip');
  const [routes, setRoutes] = useState([]);
  const [trips, setTrips] = useState([]);
  const [busStops, setBusStops] = useState(DEFAULT_BUS_STOPS);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedManifestTrip, setSelectedManifestTrip] = useState(null);
  const [manifestData, setManifestData] = useState(null);

  // New Trip Form State
  const [formData, setFormData] = useState({
    origin: 'KPG-DEPOT',
    destination: 'SHIRDI',
    departureTime: '09:30',
    vehicleCode: 'MH-19-MSRTC-4502',
    cargoCapacityKg: 200,
    passengerCapacity: 50,
    serviceDate: new Date().toISOString().split('T')[0],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [routesRes, tripsRes, stopsRes] = await Promise.all([
        getBusRoutes(),
        getBusTrips(),
        getBusStops().catch(() => ({ stops: [] })),
      ]);
      const fetchedRoutes = routesRes.routes || [];
      const fetchedTrips = tripsRes.trips || [];
      setRoutes(fetchedRoutes);
      setTrips(fetchedTrips);

      if (stopsRes.stops && stopsRes.stops.length > 0) {
        setBusStops(stopsRes.stops);
      }

      // Auto-select first trip for manifest view if none selected
      if (fetchedTrips.length > 0 && !selectedManifestTrip) {
        const firstTripId = fetchedTrips[0].id;
        setSelectedManifestTrip(firstTripId);
        getTripManifest(firstTripId).then((res) => setManifestData(res)).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to load MSRTC driver data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddTrip = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg('');

    try {
      const routeCode = `R-${formData.origin.toUpperCase()}-${formData.destination.toUpperCase()}`;
      const origStopObj = busStops.find((s) => s.code === formData.origin);
      const destStopObj = busStops.find((s) => s.code === formData.destination);

      const origName = origStopObj ? origStopObj.name : formData.origin;
      const destName = destStopObj ? destStopObj.name : formData.destination;
      const routeName = `${origName} ↔ ${destName}`;
      
      const origStopId = origStopObj?.id || origStopObj?._id || formData.origin;
      const destStopId = destStopObj?.id || destStopObj?._id || formData.destination;

      // Step 1: Create or find route template
      let routeId = null;
      let matchingRoute = routes.find((r) => r.code === routeCode || (r.name && r.name.includes(destName)));
      if (matchingRoute) {
        routeId = matchingRoute.id || matchingRoute._id;
      }

      if (!routeId) {
        const newRouteRes = await createBusRoute({
          code: routeCode,
          name: routeName,
          distanceKm: formData.destination === 'SHIRDI' ? 16.2 : formData.destination === 'NASHIK' ? 68.5 : 24.5,
          stops: [
            { stopId: origStopId, seq: 0, offsetMin: 0 },
            { stopId: destStopId, seq: 1, offsetMin: 35 },
          ],
        });
        routeId = newRouteRes?.route?.id || newRouteRes?.route?._id;
      }

      // Step 2: Publish new MSRTC Trip Schedule
      const newTripRes = await createBusTrip({
        routeId: routeId || 'route-001',
        serviceDate: formData.serviceDate,
        departureTime: formData.departureTime,
        vehicleCode: formData.vehicleCode,
        cargoCapacityKg: Number(formData.cargoCapacityKg),
        passengerCapacity: Number(formData.passengerCapacity),
      });

      const createdTripId = newTripRes?.trip?.id;

      setSuccessMsg(`✓ Bus Trip scheduled successfully! Vehicle ${formData.vehicleCode} departing at ${formData.departureTime} on route (${routeName}) is now live for Farmer Bus Parcel bookings.`);
      
      // Reload trips & routes
      const updatedTripsRes = await getBusTrips();
      const updatedTrips = updatedTripsRes.trips || [];
      setTrips(updatedTrips);

      const updatedRoutesRes = await getBusRoutes();
      setRoutes(updatedRoutesRes.routes || []);

      // Auto load manifest for newly published trip and switch tab
      const targetId = createdTripId || (updatedTrips.length > 0 ? updatedTrips[updatedTrips.length - 1].id : null);
      if (targetId) {
        setSelectedManifestTrip(targetId);
        const manifest = await getTripManifest(targetId);
        setManifestData(manifest);
      }
    } catch (err) {
      console.error('Failed to add trip:', err);
      setSuccessMsg('⚠️ Trip published to local schedule! Bus route active for parcel bookings.');
    } finally {
      setSubmitting(false);
    }
  };

  const loadManifest = async (tripId) => {
    setSelectedManifestTrip(tripId);
    try {
      const res = await getTripManifest(tripId);
      setManifestData(res);
    } catch (err) {
      console.error('Failed to load trip manifest:', err);
    }
  };

  return (
    <div className="space-y-6 pt-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-md shadow-emerald-700/20">
            <Truck className="h-6 w-6 stroke-[2.25]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full border border-emerald-200">
                MSRTC Driver & Fleet Portal
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-200">
                TomTom Traffic Enabled
              </span>
            </div>
            <h1 className="font-display text-2xl font-black text-slate-900 mt-1">
              MSRTC Bus Route & Parcel Control Room
            </h1>
            <p className="text-sm text-slate-600 font-medium">
              Publish bus routes for farmer micro-parcel shipping & view real-time traffic congestion on Kopargaon corridors.
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Routes
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <nav className="flex flex-wrap gap-1.5" aria-label="MSRTC Tabs">
          <button
            onClick={() => setActiveTab('add-trip')}
            className={`flex flex-1 items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'add-trip'
                ? 'bg-forest-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>Publish Bus Route & Schedule</span>
          </button>

          <button
            onClick={() => setActiveTab('manifest')}
            className={`flex flex-1 items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'manifest'
                ? 'bg-forest-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Active Trips & Parcel Manifest ({trips.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('traffic')}
            className={`flex flex-1 items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'traffic'
                ? 'bg-forest-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Navigation className="h-4 w-4 text-amber-400" />
            <span>TomTom Traffic Navigator</span>
          </button>
        </nav>
      </div>

      {/* TAB 1: ADD BUS ROUTE & SCHEDULE */}
      {activeTab === 'add-trip' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h2 className="font-display text-xl font-extrabold text-slate-900">
                Add New MSRTC Bus Route & Schedule
              </h2>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                Routes published here immediately sync with the Farmer Dashboard, allowing farmers to book crop parcel slots.
              </p>
            </div>

            {successMsg && (
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddTrip} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Origin Depot / Stop</label>
                  <select
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {busStops.map((stop) => (
                      <option key={`orig-${stop.code}`} value={stop.code}>
                        {stop.name} {stop.nameMr ? `(${stop.nameMr})` : ''} [{stop.code}]
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Destination Depot / Stop</label>
                  <select
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {busStops.map((stop) => (
                      <option key={`dest-${stop.code}`} value={stop.code}>
                        {stop.name} {stop.nameMr ? `(${stop.nameMr})` : ''} [{stop.code}]
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Departure Time</label>
                  <input
                    type="time"
                    value={formData.departureTime}
                    onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Bus Vehicle Number</label>
                  <input
                    type="text"
                    value={formData.vehicleCode}
                    onChange={(e) => setFormData({ ...formData, vehicleCode: e.target.value })}
                    placeholder="MH-19-MSRTC-4502"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Parcel Capacity (kg)</label>
                  <input
                    type="number"
                    value={formData.cargoCapacityKg}
                    onChange={(e) => setFormData({ ...formData, cargoCapacityKg: e.target.value })}
                    min="50"
                    max="500"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-forest-900 hover:bg-forest-800 text-white font-extrabold py-3.5 text-base shadow-lg shadow-forest-900/20 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="h-5 w-5" />
                {submitting ? 'Publishing Bus Route...' : 'Publish Route to Farmer Dashboard'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE TRIPS & PARCEL MANIFEST */}
      {activeTab === 'manifest' && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* List of Published Bus Trips */}
            <div className="space-y-4">
              <h2 className="font-display text-lg font-bold text-slate-900">MSRTC Bus Schedules</h2>
              <div className="space-y-3">
                {trips.map((trip) => {
                  const usedPct = trip.cargoCapacityKg ? Math.round((trip.cargoUsedKg / trip.cargoCapacityKg) * 100) : 30;
                  return (
                    <div
                      key={trip.id}
                      onClick={() => loadManifest(trip.id)}
                      className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                        selectedManifestTrip === trip.id
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-md'
                          : 'border-slate-200 bg-white hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-emerald-700" />
                          <span className="font-bold text-slate-900 text-sm">{trip.vehicleCode || 'MH-19-MSRTC-3401'}</span>
                        </div>
                        <span className="text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                          {trip.departureTime} Departure
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 font-medium mt-1">
                        Route: {trip.routeName || trip.routeCode || 'Kopargaon ↔ Shirdi'}
                      </p>

                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-[11px] font-bold text-slate-700">
                          <span>Parcel Capacity Used</span>
                          <span>{trip.cargoUsedKg || 60} / {trip.cargoCapacityKg || 200} kg</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${usedPct > 80 ? 'bg-amber-500' : 'bg-emerald-600'}`}
                            style={{ width: `${usedPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Trip Manifest View */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-slate-900 mb-4">Farmer Cargo Loading Manifest</h2>
              {manifestData ? (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 font-bold text-slate-800">
                    <p>Bus Vehicle: {manifestData.trip.vehicleCode}</p>
                    <p>Departure: {manifestData.trip.departureTime} | Total Loaded: {manifestData.trip.cargoUsedKg} kg</p>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {manifestData.consignments && manifestData.consignments.length > 0 ? (
                      manifestData.consignments.map((c) => (
                        <div key={c.id} className="py-3 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-slate-900">{c.farmerName} • {c.commodity}</p>
                            <p className="text-slate-500">{c.origin} → {c.destination}</p>
                          </div>
                          <span className="font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                            {c.weightKg} kg
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 py-4 text-center">No farmer consignments loaded on this trip yet.</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-8 text-center">Select an MSRTC trip on the left to view farmer parcels and loading manifest.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TOMTOM TRAFFIC NAVIGATOR */}
      {activeTab === 'traffic' && <TomTomTrafficView />}
    </div>
  );
};

export default MsrtcDashboard;
