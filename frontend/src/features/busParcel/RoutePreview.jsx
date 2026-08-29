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
    <div className="border border-green-200 rounded-lg bg-green-50">
      {/* Header */}
      <div className="p-4 border-b border-green-200">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-green-900">
              {preview.totalAvailableTrips} Trip(s) Available
            </h4>
            <p className="text-sm text-green-700 mt-1">{preview.recommendation}</p>
            
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-green-800">
              <div>
                <MapPin className="inline h-3 w-3 mr-1" />
                {preview.originStop?.name} → {preview.destStop?.name}
              </div>
              <div>
                <Navigation className="inline h-3 w-3 mr-1" />
                {preview.straightLineDistanceKm} km
              </div>
              <div>
                <span className="font-medium">{preview.serviceDate}</span> ({preview.dayOfWeek})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Routes and Trips */}
      <div className="p-4 space-y-4">
        {preview.routes.map((route, routeIdx) => (
          <div key={routeIdx} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Route Header */}
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-sm font-semibold text-gray-900">
                    {route.routeName}
                  </h5>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                    <span className="font-mono bg-gray-200 px-2 py-0.5 rounded">
                      {route.routeCode}
                    </span>
                    <span>
                      <Navigation className="inline h-3 w-3 mr-1" />
                      {route.segmentDistanceKm} km
                    </span>
                    <span>
                      <Clock className="inline h-3 w-3 mr-1" />
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
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                    Fastest
                  </span>
                )}
              </div>

              {!route.operatesOnDay && (
                <div className="mt-2 text-xs text-yellow-700 bg-yellow-100 border border-yellow-300 rounded px-2 py-1">
                  {route.message}
                </div>
              )}
            </div>

            {/* Available Trips */}
            {route.availableTrips && route.availableTrips.length > 0 ? (
              <div className="p-4 space-y-2">
                {route.availableTrips.map((trip, tripIdx) => (
                  <div 
                    key={tripIdx}
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Bus className="h-5 w-5 text-gray-600" />
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          Departure: {trip.departureTime}
                        </div>
                        <div className="text-xs text-gray-600">
                          {trip.vehicleCode} • {trip.status}
                          {trip.delayMin > 0 && (
                            <span className="text-yellow-600 ml-2">
                              ({trip.delayMin} min delay)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-semibold text-green-700">
                        {trip.availableCapacityKg} kg available
                      </div>
                      <div className="text-xs text-gray-600">
                        {trip.utilizationPct}% utilized
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-sm text-gray-600">
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
