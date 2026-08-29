import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Bus, AlertCircle, CheckCircle, Navigation } from 'lucide-react';
import { getRoutePreview } from '../../services/apiV2';

/**
 * RoutePreview Component
 * 
 * Shows available routes and trips between origin and destination:
 * - Route validation
 * - Available trips with capacity
 * - Travel time and distance
 * - Day-of-week availability
 */
export const RoutePreview = ({ 
  originStopId, 
  destStopId, 
  date, 
  requiredCapacityKg,
  onRouteValidated 
}) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPreview = async () => {
      // Reset state
      setPreview(null);
      setError(null);

      // Validate inputs
      if (!originStopId || !destStopId) {
        if (onRouteValidated) {
          onRouteValidated(null);
        }
        return;
      }

      if (originStopId === destStopId) {
        setError('Origin and destination cannot be the same');
        if (onRouteValidated) {
          onRouteValidated({ isValid: false, error: 'Same origin and destination' });
        }
        return;
      }

      setLoading(true);

      try {
        const data = await getRoutePreview(
          originStopId,
          destStopId,
          date || new Date().toISOString().split('T')[0],
          requiredCapacityKg || 0
        );

        setPreview(data);

        if (onRouteValidated) {
          onRouteValidated(data);
        }
      } catch (err) {
        console.error('Route preview error:', err);
        setError(err.message);
        if (onRouteValidated) {
          onRouteValidated({ isValid: false, error: err.message });
        }
      } finally {
        setLoading(false);
      }
    };

    loadPreview();
  }, [originStopId, destStopId, date, requiredCapacityKg, onRouteValidated]);

  // Loading state
  if (loading) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
          <span className="text-sm text-gray-600">Checking route availability...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="border border-red-200 rounded-lg p-4 bg-red-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-red-900">Route Check Failed</h4>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // No preview yet
  if (!preview) {
    return null;
  }

  // Route not valid
  if (!preview.isValid) {
    return (
      <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-yellow-900">No Direct Route Available</h4>
            <p className="text-sm text-yellow-700 mt-1">{preview.error || preview.recommendation}</p>
            
            {preview.straightLineDistanceKm && (
              <p className="text-xs text-yellow-600 mt-2">
                Straight-line distance: {preview.straightLineDistanceKm} km
              </p>
            )}

            {preview.code === 'REVERSE_ROUTE_ONLY' && (
              <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
                <strong>Tip:</strong> Try swapping the origin and destination stops.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Route valid but no trips available
  if (!preview.hasAvailableTrips) {
    return (
      <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-yellow-900">No Trips Available</h4>
            <p className="text-sm text-yellow-700 mt-1">{preview.recommendation}</p>
            
            <div className="mt-3 space-y-2">
              <div className="text-xs text-yellow-800">
                <strong>Date:</strong> {preview.serviceDate} ({preview.dayOfWeek})
              </div>
              <div className="text-xs text-yellow-800">
                <strong>Required capacity:</strong> {requiredCapacityKg || 0} kg
              </div>
            </div>

            {preview.routes && preview.routes.length > 0 && (
              <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
                <strong>{preview.routes.length}</strong> route(s) found, but no trips with sufficient capacity on this date.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Success - show routes and trips
  return (
    <div className="border border-emerald-800/20 rounded-2xl bg-gradient-to-b from-emerald-50/50 via-white to-green-50/30 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-emerald-950/10 bg-emerald-50/60">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-forest-700 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-forest-950">
              {preview.totalAvailableTrips} Trip(s) Available
            </h4>
            <p className="text-xs font-medium text-slate-600 mt-0.5">{preview.recommendation}</p>
            
            <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
              <span className="bg-white/80 border border-emerald-800/10 px-2.5 py-1 rounded-lg font-semibold text-slate-700 shadow-2xs">
                <MapPin className="inline h-3 w-3 mr-1 text-forest-600" />
                {preview.originStop?.name} → {preview.destStop?.name}
              </span>
              <span className="bg-white/80 border border-emerald-800/10 px-2.5 py-1 rounded-lg font-semibold text-slate-700 shadow-2xs">
                <Navigation className="inline h-3 w-3 mr-1 text-forest-600" />
                {preview.straightLineDistanceKm} km
              </span>
              <span className="bg-white/80 border border-emerald-800/10 px-2.5 py-1 rounded-lg font-semibold text-slate-700 shadow-2xs">
                <span className="font-bold text-forest-800">{preview.serviceDate}</span> ({preview.dayOfWeek})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Routes and Trips */}
      <div className="p-4 space-y-4">
        {preview.routes.map((route, routeIdx) => (
          <div key={routeIdx} className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
            {/* Route Header */}
            <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200/60">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-sm font-bold text-ink">
                    {route.routeName}
                  </h5>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-medium">
                    <span className="font-mono bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md font-bold">
                      {route.routeCode}
                    </span>
                    <span>
                      <Navigation className="inline h-3 w-3 mr-1 text-slate-400" />
                      {route.segmentDistanceKm} km
                    </span>
                    <span>
                      <Clock className="inline h-3 w-3 mr-1 text-slate-400" />
                      {route.estimatedTravelTime}
                    </span>
                    {route.intermediateStops > 0 && (
                      <span>
                        {route.intermediateStops} stop(s) between
                      </span>
                    )}
                  </div>
                </div>
                
                {routeIdx === 0 && (
                  <span className="px-2.5 py-1 bg-gradient-to-r from-forest-700 to-forest-800 text-white text-[11px] font-bold rounded-full shadow-2xs">
                    Fastest
                  </span>
                )}
              </div>

              {!route.operatesOnDay && (
                <div className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 font-medium">
                  {route.message}
                </div>
              )}
            </div>

            {/* Available Trips */}
            {route.availableTrips && route.availableTrips.length > 0 ? (
              <div className="p-3 space-y-2">
                {route.availableTrips.map((trip, tripIdx) => (
                  <div 
                    key={tripIdx}
                    className="flex items-center justify-between p-3 bg-slate-50/60 hover:bg-emerald-50/40 rounded-xl border border-slate-200/70 transition-all duration-150"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-forest-100/80 flex items-center justify-center text-forest-800 shrink-0">
                        <Bus className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-ink">
                          Departure: <span className="text-forest-800">{trip.departureTime}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                          {trip.vehicleCode} • <span className="capitalize">{trip.status}</span>
                          {trip.delayMin > 0 && (
                            <span className="text-amber-700 font-bold ml-2">
                              ({trip.delayMin} min delay)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-forest-700 bg-emerald-100/60 px-2.5 py-1 rounded-full border border-emerald-200/60 inline-block">
                        {trip.availableCapacityKg} kg available
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500 mt-1">
                        {trip.utilizationPct}% utilized
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-xs font-medium text-slate-500 text-center">
                No trips with sufficient capacity
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoutePreview;
