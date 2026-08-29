import React, { useEffect, useState } from 'react';
import { getBusStops, getBusRoutes } from '../../services/apiV2';
import { MapPin, Navigation, Truck } from 'lucide-react';

/**
 * Bus Network Map — Simplified view showing stops and routes.
 * (MapLibre GL JS temporarily disabled due to import issues)
 */
export const BusNetworkMap = () => {
  const [stops, setStops] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [stopsData, routesData] = await Promise.all([
          getBusStops(),
          getBusRoutes(),
        ]);

        setStops(stopsData.stops || []);
        setRoutes(routesData.routes || []);
      } catch (err) {
        console.error('Failed to load map data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-700 font-medium">Loading network data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Navigation className="h-5 w-5 text-blue-700" />
          <h2 className="text-lg font-semibold text-blue-900">Bus Network Overview</h2>
        </div>
        <p className="text-sm text-blue-800">
          Network covering Kopargaon taluka with connections to Shirdi, Nashik, Sangamner, and other destinations.
        </p>
      </div>

      {/* Network Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Bus Stops</h3>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stops.length}</div>
          <div className="text-sm text-gray-600 mt-1">
            {stops.filter(s => s.type === 'depot').length} depots, 
            {' '}{stops.filter(s => s.type === 'apmc_mandi').length} mandis
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Navigation className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Routes</h3>
          </div>
          <div className="text-3xl font-bold text-gray-900">{routes.length}</div>
          <div className="text-sm text-gray-600 mt-1">Active bus routes</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Coverage</h3>
          </div>
          <div className="text-3xl font-bold text-gray-900">79</div>
          <div className="text-sm text-gray-600 mt-1">Villages served</div>
        </div>
      </div>

      {/* Bus Stops List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Bus Stops</h3>
        </div>
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {stops.map((stop) => (
            <div key={stop.id} className="px-4 py-3 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex-shrink-0 w-3 h-3 rounded-full mt-1 ${
                      stop.type === 'depot'
                        ? 'bg-blue-500'
                        : stop.type === 'apmc_mandi'
                        ? 'bg-green-500'
                        : 'bg-gray-400'
                    }`}
                  />
                  <div>
                    <div className="font-medium text-gray-900">{stop.name}</div>
                    <div className="text-sm text-gray-600">
                      {stop.code} • {stop.district}
                      {stop.type === 'depot' && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Depot</span>
                      )}
                      {stop.type === 'apmc_mandi' && (
                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">APMC Mandi</span>
                      )}
                    </div>
                    {stop.location && (
                      <div className="text-xs text-gray-500 mt-1 font-mono">
                        {stop.location.coordinates[1].toFixed(4)}, {stop.location.coordinates[0].toFixed(4)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Routes List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Routes</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {routes.map((route) => (
            <div key={route.id} className="px-4 py-3 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-medium text-gray-900">{route.name}</div>
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">
                      {route.code}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {route.origin} → {route.destination}
                  </div>
                  {route.distance && (
                    <div className="text-xs text-gray-500 mt-1">
                      {route.distance} km • ~{Math.round(route.distance / 50)} hours
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{route.departuresPerDay || 6} trips/day</div>
                  <div className="text-xs text-gray-500">06:00 - 18:00</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map Placeholder */}
      <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <div className="text-gray-700 font-medium mb-2">Interactive Map Coming Soon</div>
        <div className="text-sm text-gray-600 max-w-md mx-auto">
          Full map visualization with stop locations, route polylines, and real-time bus positions will be available once MapLibre GL JS import issue is resolved.
        </div>
      </div>
    </div>
  );
};

export default BusNetworkMap;
