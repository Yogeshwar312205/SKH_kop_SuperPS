import React, { useState, useEffect } from 'react';
import { Package, Loader, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { createConsignment, explainConsignment, getBusStops, getPackagingTypes } from '../../services/apiV2';
import { CommodityInput } from './CommodityInput';
import { RoutePreview } from './RoutePreview';

/**
 * Enhanced Consignment Booking Form
 * 
 * Integrates:
 * - Real-time commodity classification with hazard detection
 * - Route validation and trip preview
 * - Live capacity checking
 * - Comprehensive validation
 * - Decision trace and booking confirmation
 */
export const ConsignmentForm = () => {
  // Form state
  const [formData, setFormData] = useState({
    originStopId: '',
    destStopId: '',
    commodity: '',
    cargoClass: 'A',
    packagingType: 'jute-sack',
    weightKg: 35,
    pieceCount: 1,
    maxPieceWeightKg: 35,
    declaredValue: 0,
    readyAt: new Date().toISOString().slice(0, 16),
    deadlineAt: new Date(Date.now() + 24 * 3600000).toISOString().slice(0, 16),
  });

  // Data state
  const [stops, setStops] = useState([]);
  const [packagingTypes, setPackagingTypes] = useState([]);

  // Loading state
  const [loadingStops, setLoadingStops] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Validation state
  const [commodityValidation, setCommodityValidation] = useState(null);
  const [routeValidation, setRouteValidation] = useState(null);

  // Result state
  const [error, setError] = useState(null);
  const [consignment, setConsignment] = useState(null);
  const [decision, setDecision] = useState(null);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setLoadingStops(true);
      try {
        const [stopsData, packagingData] = await Promise.all([
          getBusStops(),
          getPackagingTypes()
        ]);

        if (stopsData && stopsData.stops) {
          setStops(stopsData.stops);
        }

        if (packagingData && packagingData.packagingTypes) {
          setPackagingTypes(packagingData.packagingTypes);
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
        setError(err.message);
      } finally {
        setLoadingStops(false);
      }
    };
    loadInitialData();
  }, []);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check commodity validation
    if (commodityValidation && !commodityValidation.isValid) {
      setError('This commodity cannot be transported on passenger buses');
      return;
    }

    setSubmitting(true);
    setError(null);
    setConsignment(null);
    setDecision(null);

    try {
      const result = await createConsignment({
        ...formData,
        readyAt: new Date(formData.readyAt).toISOString(),
        deadlineAt: formData.deadlineAt ? new Date(formData.deadlineAt).toISOString() : null,
      });

      if (!result.success) {
        throw new Error(result.message || 'Failed to create consignment');
      }

      setConsignment(result.consignment);

      // Fetch decision trace
      try {
        const decisionData = await explainConsignment(result.consignment.id);
        if (decisionData.success) {
          setDecision(decisionData.decision);
        }
      } catch (decisionErr) {
        console.warn('Failed to load decision trace:', decisionErr);
      }

      // Scroll to result
      setTimeout(() => {
        document.getElementById('booking-result')?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);

    } catch (err) {
      setError(err.message || 'Failed to book consignment');
      console.error('Booking error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getServiceDate = () => {
    return formData.readyAt ? formData.readyAt.split('T')[0] : new Date().toISOString().split('T')[0];
  };

  const canSubmit = () => {
    return (
      !loadingStops &&
      !submitting &&
      formData.commodity.trim().length >= 3 &&
      formData.originStopId &&
      formData.destStopId &&
      formData.originStopId !== formData.destStopId &&
      (!commodityValidation || commodityValidation.isValid)
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="h-7 w-7" />
          Book Consignment
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Send cargo via passenger bus network • Save up to 62% vs dedicated fleet
        </p>
      </div>

      {/* Loading Banner */}
      {loadingStops && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-blue-800 text-sm flex items-center gap-3">
          <Loader className="h-5 w-5 animate-spin" />
          <span>Loading bus network...</span>
        </div>
      )}

      {/* No Stops Warning */}
      {!loadingStops && stops.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-yellow-800 text-sm">
          <strong>No bus stops found.</strong> Database may not be seeded.
          <div className="mt-2 text-xs">
            Run: <code className="bg-yellow-100 px-2 py-1 rounded font-mono">node scripts/seedKopargaon.js</code>
          </div>
        </div>
      )}

      {/* Booking Form */}
      <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        
        {/* Origin and Destination */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Origin Stop *
            </label>
            <select
              value={formData.originStopId}
              onChange={(e) => handleChange('originStopId', e.target.value)}
              required
              disabled={loadingStops || stops.length === 0}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-semibold text-ink focus:bg-white focus:border-forest-600 focus:ring-2 focus:ring-forest-600/20 disabled:bg-slate-100 transition-all"
            >
              <option value="">Select origin...</option>
              {stops.map((stop) => (
                <option key={stop.id} value={stop.id}>
                  {stop.name} ({stop.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Destination Stop *
            </label>
            <select
              value={formData.destStopId}
              onChange={(e) => handleChange('destStopId', e.target.value)}
              required
              disabled={loadingStops || stops.length === 0}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-semibold text-ink focus:bg-white focus:border-forest-600 focus:ring-2 focus:ring-forest-600/20 disabled:bg-slate-100 transition-all"
            >
              <option value="">Select destination...</option>
              {stops.map((stop) => (
                <option key={stop.id} value={stop.id}>
                  {stop.name} ({stop.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Route Preview */}
        {formData.originStopId && formData.destStopId && (
          <RoutePreview
            originStopId={formData.originStopId}
            destStopId={formData.destStopId}
            date={getServiceDate()}
            requiredCapacityKg={formData.weightKg}
            onRouteValidated={setRouteValidation}
          />
        )}

        {/* Commodity Classification */}
        <CommodityInput
          value={formData.commodity}
          onChange={(value) => handleChange('commodity', value)}
          packaging={formData.packagingType}
          weight={formData.weightKg}
          pieceCount={formData.pieceCount}
          onValidationChange={setCommodityValidation}
        />

        {/* Packaging and Weight */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Packaging *
            </label>
            <select
              value={formData.packagingType}
              onChange={(e) => handleChange('packagingType', e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              {packagingTypes.length > 0 ? (
                packagingTypes.map((pkg) => (
                  <option key={pkg.value} value={pkg.value}>{pkg.label}</option>
                ))
              ) : (
                <>
                  <option value="jute-sack">Jute Sack</option>
                  <option value="plastic-sack">Plastic Sack</option>
                  <option value="hdpe-bag">HDPE Bag</option>
                  <option value="cardboard-box">Cardboard Box</option>
                  <option value="sealed-box">Sealed Box</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weight (kg) *
            </label>
            <input
              type="number"
              value={formData.weightKg}
              onChange={(e) => handleChange('weightKg', Number(e.target.value))}
              required
              min="1"
              max="200"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pieces *
            </label>
            <input
              type="number"
              value={formData.pieceCount}
              onChange={(e) => {
                const count = Number(e.target.value);
                handleChange('pieceCount', count);
                if (count > 0) {
                  handleChange('maxPieceWeightKg', Math.min(Math.ceil(formData.weightKg / count), 50));
                }
              }}
              required
              min="1"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Additional Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Piece Weight (kg) *
            </label>
            <input
              type="number"
              value={formData.maxPieceWeightKg}
              onChange={(e) => handleChange('maxPieceWeightKg', Number(e.target.value))}
              required
              min="1"
              max="50"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">MSRTC limit: 50 kg</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Declared Value (₹)
            </label>
            <input
              type="number"
              value={formData.declaredValue}
              onChange={(e) => handleChange('declaredValue', Number(e.target.value))}
              min="0"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cargo Class
            </label>
            <select
              value={formData.cargoClass}
              onChange={(e) => handleChange('cargoClass', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="A">A - Agricultural</option>
              <option value="B">B - General</option>
              <option value="C">C - Institutional</option>
            </select>
          </div>
        </div>

        {/* Timing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ready By *
            </label>
            <input
              type="datetime-local"
              value={formData.readyAt}
              onChange={(e) => handleChange('readyAt', e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deadline (Optional)
            </label>
            <input
              type="datetime-local"
              value={formData.deadlineAt}
              onChange={(e) => handleChange('deadlineAt', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-800 text-sm flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit()}
          className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader className="h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Package className="h-5 w-5" />
              Book Consignment
            </>
          )}
        </button>
      </form>

      {/* Result */}
      {consignment && (
        <div id="booking-result">
          <BookingResult consignment={consignment} decision={decision} />
        </div>
      )}
    </div>
  );
};

/**
 * Booking Result Component
 */
const BookingResult = ({ consignment, decision }) => {
  const isAssigned = consignment.status === 'assigned';
  const isRerouted = consignment.status === 'rerouted_to_fleet';

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      <div className={`border rounded-lg p-6 ${
        isAssigned ? 'bg-green-50 border-green-200' : 
        isRerouted ? 'bg-yellow-50 border-yellow-200' : 
        'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-start gap-4">
          {isAssigned ? <CheckCircle className="h-8 w-8 text-green-600" /> :
           isRerouted ? <AlertTriangle className="h-8 w-8 text-yellow-600" /> :
           <XCircle className="h-8 w-8 text-red-600" />}
          
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-2">
              {isAssigned ? 'Booking Confirmed!' : isRerouted ? 'Rerouted to Fleet' : 'Booking Rejected'}
            </h2>
            
            {/* Booking Code */}
            {consignment.bookingCode && (
              <div className="mb-3 p-3 bg-white rounded border">
                <div className="text-sm text-gray-600">Booking Code</div>
                <div className="text-2xl font-mono font-bold">{consignment.bookingCode}</div>
              </div>
            )}

            {/* Details */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div><span className="text-gray-600">Status:</span> <span className="font-semibold capitalize">{consignment.status.replace(/_/g, ' ')}</span></div>
              {consignment.assignment?.network && <div><span className="text-gray-600">Network:</span> <span className="font-semibold">{consignment.assignment.network}</span></div>}
              {consignment.assignment?.totalCost && <div><span className="text-gray-600">Cost:</span> <span className="font-semibold text-green-700">₹{consignment.assignment.totalCost}</span></div>}
              {consignment.assignment?.routeCode && <div><span className="text-gray-600">Route:</span> <span className="font-mono">{consignment.assignment.routeCode}</span></div>}
              {consignment.assignment?.departureTime && <div><span className="text-gray-600">Departs:</span> <span className="font-semibold">{consignment.assignment.departureTime}</span></div>}
              {consignment.assignment?.travelTimeMin && <div><span className="text-gray-600">Travel:</span> <span>{consignment.assignment.travelTimeMin} min</span></div>}
            </div>
          </div>
        </div>
      </div>

      {/* Decision Trace */}
      {decision && decision.trace && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Decision Trace</h3>
          <div className="space-y-3">
            {decision.trace.map((entry, i) => (
              <div key={i} className={`flex gap-3 p-3 rounded border ${
                entry.result === 'PASS' ? 'bg-green-50 border-green-200' :
                entry.result === 'FAIL' ? 'bg-red-50 border-red-200' :
                'bg-yellow-50 border-yellow-200'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  entry.result === 'PASS' ? 'bg-green-200 text-green-800' :
                  entry.result === 'FAIL' ? 'bg-red-200 text-red-800' :
                  'bg-yellow-200 text-yellow-800'
                }`}>
                  {entry.result === 'PASS' ? '✓' : entry.result === 'FAIL' ? '✗' : '!'}
                </div>
                <div className="flex-1">
                  <div className="font-mono font-semibold text-sm mb-1">{entry.rule || entry.code}</div>
                  <p className="text-sm text-gray-700">{entry.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsignmentForm;
