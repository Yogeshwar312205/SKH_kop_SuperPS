import React, { useState, useEffect } from 'react';
import { MapPin, Bus, Route, Loader, AlertTriangle } from 'lucide-react';
import { getBusStops, getBusRoutes, getBusTrips } from '../../services/apiV2';

/**
 * Network Visualization Component
 * 
 * Shows bus network with:
 * - All stops with locations
 * - All routes with details
 * - Today's trips with capacity
 */
export const NetworkVisualization = () => {
  const [stops, setStops] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('stops');

  useEffect(() => {
    loadNetworkData();
  }, []);

  const loadNetworkData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [stopsData, routesData, tripsData] = await Promise.all([
        getBusStops(),
        getBusRoutes(),
        getBusTrips({ date: new Date().toISOString().split('T')[0] })
      ]);

      if (stopsData.success) setStops(stopsData.stops || []);
      if (routesData.success) setRoutes(routesData.routes || []);
      if (tripsData.success) setTrips(tripsData.trips || []);

    } catch (err) {
      console.error('Failed to load network data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Error loading network data:</strong> {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bus Network</h1>
        <p className="text-sm text-gray-600 mt-1">
          {stops.length} stops • {routes.length} routes • {trips.length} trips today
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px space-x-8">
          {['stops', 'routes', 'trips'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Stops Tab */}
      {activeTab === 'stops' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stops.map((stop) => (
            <div key={stop.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 rounded">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{stop.name}</h3>
                  <div className="text-sm text-gray-600 mt-1">{stop.nameMr}</div>
                  <div className="mt-2 space-y-1 text-xs text-gray-500">
                    <div>Code: <span className="font-mono">{stop.code}</span></div>
                    {stop.isDepot && (
                      <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded">
                        Depot
                      </span>
                    )}
                    {stop.isMandi && (
                      <span className="inline-block px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded ml-1">
                        Mandi
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Routes Tab */}
      {activeTab === 'routes' && (
        <div className="space-y-3">
          {routes.map((route) => (
            <div key={route.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded">
                    <Route className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{route.name}</h3>
                    <div className="text-sm text-gray-600 font-mono">{route.code}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">{route.distanceKm} km</div>
                  <div className="text-xs text-gray-600">{route.estimatedDurationMin || route.stops[route.stops.length - 1]?.offsetMin || 0} min</div>
                </div>
              </div>

              {/* Stops on Route */}
              {route.stops && route.stops.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500 mb-2">{route.stops.length} stops:</div>
                  <div className="flex flex-wrap gap-2">
                    {route.stops.map((stop, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
                      >
                        {stop.stopName || stop.stopCode || `Stop ${idx + 1}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Trips Tab */}
      {activeTab === 'trips' && (
        <div className="space-y-3">
          {trips.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <Bus className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No trips scheduled today</h3>
              <p className="text-sm text-gray-600">Try seeding the database with trip data</p>
            </div>
          ) : (
            trips.map((trip) => (
              <div key={trip.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded">
                      <Bus className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{trip.routeCode || 'Unknown Route'}</h3>
                      <div className="text-sm text-gray-600">{trip.vehicleCode}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{trip.departureTime}</div>
                    <div className={`text-xs px-2 py-0.5 rounded ${
                      trip.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                      trip.status === 'running' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {trip.status}
                    </div>
                  </div>
                </div>

                {/* Capacity Info */}
                <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-gray-100 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">Cargo Capacity</div>
                    <div className="font-semibold text-gray-900">{trip.cargoCapacityKg} kg</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Used</div>
                    <div className="font-semibold text-gray-900">{trip.cargoUsedKg} kg</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Available</div>
                    <div className="font-semibold text-green-700">{trip.availableCapacityKg || trip.predictedSpareKg - trip.cargoUsedKg} kg</div>
                  </div>
                </div>

                {/* Utilization Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Utilization</span>
                    <span className="font-semibold">{trip.utilizationPct}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        trip.utilizationPct > 80 ? 'bg-red-500' :
                        trip.utilizationPct > 60 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${trip.utilizationPct}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NetworkVisualization;
