import React, { useState, useEffect } from 'react';
import { Search, Filter, Package, MapPin, Clock, CheckCircle, XCircle, AlertTriangle, Loader, RefreshCw, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { getConsignments, explainConsignment, getConsignmentTracking } from '../../services/apiV2';

/**
 * Booking History Component
 * 
 * Shows farmer's consignment history with:
 * - Status filtering
 * - Search by booking code
 * - Quick stats
 * - Click to view expanded details and decision trace
 */
export const BookingHistory = () => {
  const [consignments, setConsignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected details expansion state
  const [expandedId, setExpandedId] = useState(null);
  const [detailsMap, setDetailsMap] = useState({}); // { [id]: { decision, tracking, loading } }

  // Load consignments
  useEffect(() => {
    loadConsignments();
  }, [statusFilter]);

  const loadConsignments = async () => {
    setLoading(true);
    setError(null);

    try {
      const filters = {};
      if (statusFilter && statusFilter !== 'all') {
        filters.status = statusFilter;
      }

      const data = await getConsignments(filters);

      if (data.success && data.consignments) {
        setConsignments(data.consignments);
      }
    } catch (err) {
      console.error('Failed to load consignments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleExpand = async (consignment) => {
    const id = consignment.id || consignment.bookingCode;
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);

    // If details already fetched, skip loading
    if (detailsMap[id] && !detailsMap[id].loading) {
      return;
    }

    // Set loading state for this item
    setDetailsMap(prev => ({
      ...prev,
      [id]: { loading: true, decision: null, tracking: null, error: null }
    }));

    try {
      const [decisionRes, trackingRes] = await Promise.allSettled([
        explainConsignment(consignment.bookingCode || consignment.id),
        getConsignmentTracking(consignment.bookingCode || consignment.id)
      ]);

      setDetailsMap(prev => ({
        ...prev,
        [id]: {
          loading: false,
          decision: decisionRes.status === 'fulfilled' && decisionRes.value?.success ? decisionRes.value.decision : null,
          tracking: trackingRes.status === 'fulfilled' && trackingRes.value?.success ? trackingRes.value.tracking : null,
          error: null
        }
      }));
    } catch (err) {
      setDetailsMap(prev => ({
        ...prev,
        [id]: { loading: false, error: err.message }
      }));
    }
  };

  // Filter consignments by search term
  const filteredConsignments = consignments.filter(c => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    return (
      c.bookingCode?.toLowerCase().includes(term) ||
      c.commodity?.toLowerCase().includes(term) ||
      c.originStop?.name?.toLowerCase().includes(term) ||
      c.destStop?.name?.toLowerCase().includes(term)
    );
  });

  // Calculate stats
  const stats = {
    total: consignments.length,
    assigned: consignments.filter(c => c.status === 'assigned').length,
    inTransit: consignments.filter(c => c.status === 'in_transit').length,
    delivered: consignments.filter(c => c.status === 'delivered').length,
    rerouted: consignments.filter(c => c.status === 'rerouted_to_fleet').length,
  };

  const getStatusBadge = (status) => {
    const badges = {
      'created': { color: 'bg-gray-100 text-gray-700', icon: null },
      'assigned': { color: 'bg-blue-100 text-blue-700', icon: <CheckCircle className="h-3 w-3" /> },
      'in_transit': { color: 'bg-green-100 text-green-700', icon: <Clock className="h-3 w-3" /> },
      'delivered': { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      'rerouted_to_fleet': { color: 'bg-yellow-100 text-yellow-700', icon: <AlertTriangle className="h-3 w-3" /> },
      'rejected': { color: 'bg-red-100 text-red-700', icon: <XCircle className="h-3 w-3" /> },
      'cancelled': { color: 'bg-gray-100 text-gray-600', icon: <XCircle className="h-3 w-3" /> },
    };

    const badge = badges[status] || badges['created'];

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        {badge.icon}
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-sm text-gray-600 mt-1">
            View and track all your consignments in real time
          </p>
        </div>
        <button
          onClick={loadConsignments}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm">
          <div className="text-sm text-blue-600">Assigned</div>
          <div className="text-2xl font-bold text-blue-700">{stats.assigned}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-sm">
          <div className="text-sm text-green-600">In Transit</div>
          <div className="text-2xl font-bold text-green-700">{stats.inTransit}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-sm">
          <div className="text-sm text-green-600">Delivered</div>
          <div className="text-2xl font-bold text-green-700">{stats.delivered}</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-sm">
          <div className="text-sm text-yellow-600">Rerouted</div>
          <div className="text-2xl font-bold text-yellow-700">{stats.rerouted}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by booking code, commodity, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="assigned">Assigned</option>
              <option value="in_transit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="rerouted_to_fleet">Rerouted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Error loading bookings:</strong> {error}
          </div>
        </div>
      )}

      {/* No Results */}
      {!loading && !error && filteredConsignments.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {consignments.length === 0 ? 'No bookings yet' : 'No results found'}
          </h3>
          <p className="text-sm text-gray-600">
            {consignments.length === 0 
              ? 'Start by booking your first consignment on the "Book Consignment" tab.'
              : 'Try adjusting your search or status filter.'}
          </p>
        </div>
      )}

      {/* Consignments List */}
      {!loading && !error && filteredConsignments.length > 0 && (
        <div className="space-y-4">
          {filteredConsignments.map((consignment) => {
            const currentId = consignment.id || consignment.bookingCode;
            const isExpanded = expandedId === currentId;
            const itemDetails = detailsMap[currentId] || {};

            return (
              <div
                key={currentId}
                className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Main Card Item */}
                <div
                  className="p-5 cursor-pointer flex items-center justify-between"
                  onClick={() => handleToggleExpand(consignment)}
                >
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between pr-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 rounded-lg">
                          <Package className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-mono font-bold text-gray-900 text-lg">
                            {consignment.bookingCode || consignment.id.slice(0, 12)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Booked on {new Date(consignment.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div>{getStatusBadge(consignment.status)}</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                      {/* Commodity */}
                      <div>
                        <div className="text-xs text-gray-500 font-medium mb-1">Commodity</div>
                        <div className="text-sm font-semibold text-gray-900">{consignment.commodity}</div>
                        <div className="text-xs text-gray-600">
                          {consignment.weightKg} kg • Class {consignment.cargoClass || 'A'}
                        </div>
                      </div>

                      {/* Route */}
                      <div>
                        <div className="text-xs text-gray-500 font-medium mb-1">Route</div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                          <span>{consignment.originStop?.name || 'Origin'}</span>
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          <span>{consignment.destStop?.name || 'Destination'}</span>
                        </div>
                        {consignment.assignment?.routeCode && (
                          <div className="text-xs text-gray-600 font-mono mt-0.5">
                            {consignment.assignment.routeCode}
                          </div>
                        )}
                      </div>

                      {/* Cost / Network */}
                      <div>
                        <div className="text-xs text-gray-500 font-medium mb-1">Transport Details</div>
                        <div className="text-sm font-semibold text-green-700">
                          {consignment.assignment?.totalCost ? `₹${consignment.assignment.totalCost}` : 'Calculated at pickup'}
                        </div>
                        <div className="text-xs text-gray-600 capitalize">
                          Network: {consignment.assignment?.network || 'bus'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pl-4 text-gray-400">
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-5 space-y-4">
                    {itemDetails.loading ? (
                      <div className="flex items-center justify-center py-6 text-sm text-gray-600 gap-2">
                        <Loader className="h-4 w-4 animate-spin text-blue-600" />
                        <span>Loading decision trace & tracking...</span>
                      </div>
                    ) : (
                      <>
                        {/* Decision Trace Section */}
                        {itemDetails.decision && itemDetails.decision.trace && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
                              <ShieldCheck className="h-4 w-4 text-green-600" />
                              Decision Trace Log (Explainability)
                            </h4>
                            <div className="space-y-2">
                              {itemDetails.decision.trace.map((rule, idx) => (
                                <div
                                  key={idx}
                                  className={`flex items-start gap-2.5 p-2.5 rounded border text-xs ${
                                    rule.result === 'PASS' ? 'bg-green-50 border-green-200' :
                                    rule.result === 'FAIL' ? 'bg-red-50 border-red-200' :
                                    'bg-yellow-50 border-yellow-200'
                                  }`}
                                >
                                  <span className={`px-1.5 py-0.5 rounded font-bold ${
                                    rule.result === 'PASS' ? 'bg-green-200 text-green-800' :
                                    rule.result === 'FAIL' ? 'bg-red-200 text-red-800' :
                                    'bg-yellow-200 text-yellow-800'
                                  }`}>
                                    {rule.rule || rule.code || 'RULE'}
                                  </span>
                                  <span className="text-gray-800 font-medium">{rule.detail}</span>
                                </div>
                              ))}
                            </div>
                            {itemDetails.decision.summary && (
                              <p className="mt-3 text-xs text-gray-600 bg-blue-50 border border-blue-100 p-2.5 rounded">
                                💡 <strong>System Summary:</strong> {itemDetails.decision.summary}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Tracking Timeline */}
                        {itemDetails.tracking && itemDetails.tracking.timeline && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
                              <Clock className="h-4 w-4 text-blue-600" />
                              Tracking History Timeline
                            </h4>
                            <div className="space-y-2">
                              {itemDetails.tracking.timeline.map((step, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-xs">
                                  <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                                  <div className="font-semibold text-gray-900 capitalize w-28">{step.status.replace(/_/g, ' ')}</div>
                                  <div className="text-gray-500">{new Date(step.timestamp).toLocaleString()}</div>
                                  {step.note && <div className="text-gray-600 italic">- {step.note}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Results Count */}
      {!loading && !error && filteredConsignments.length > 0 && (
        <div className="text-sm text-gray-600 text-center">
          Showing {filteredConsignments.length} of {consignments.length} bookings
        </div>
      )}
    </div>
  );
};

export default BookingHistory;

