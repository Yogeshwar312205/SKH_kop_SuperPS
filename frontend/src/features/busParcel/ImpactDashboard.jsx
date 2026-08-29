import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Truck, Leaf, Package, Loader, AlertTriangle, Calendar } from 'lucide-react';
import { getDashboardMetrics } from '../../services/apiV2';

/**
 * Impact Dashboard — Real-time metrics from database
 * 
 * Shows:
 * - Cost savings (bus vs fleet baseline)
 * - Vehicle-km avoided
 * - CO2 emissions saved
 * - Assignment rates
 * - Daily trends
 */
export const ImpactDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('week'); // week, month, all

  useEffect(() => {
    loadMetrics();
  }, [dateRange]);

  const loadMetrics = async () => {
    setLoading(true);
    setError(null);

    try {
      const filters = {};
      
      // Set date range
      if (dateRange === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        filters.startDate = weekAgo.toISOString().split('T')[0];
      } else if (dateRange === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filters.startDate = monthAgo.toISOString().split('T')[0];
      }

      const data = await getDashboardMetrics(filters);

      if (data.success) {
        setMetrics(data);
      }
    } catch (err) {
      console.error('Failed to load metrics:', err);
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
            <strong>Error loading dashboard:</strong> {error}
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const { summary, impact, utilization, breakdown, trends } = metrics;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Impact Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            Real-time metrics showing the environmental and economic impact
          </p>
        </div>

        {/* Date Range Filter */}
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cost Savings */}
        <MetricCard
          title="Cost Savings"
          value={`₹${impact.costSavings.toLocaleString()}`}
          subtitle={`Avg ₹${impact.averageSavingsPerConsignment} per booking`}
          icon={<DollarSign className="h-6 w-6 text-green-600" />}
          color="green"
          trend={{ value: summary.assignmentRate, label: `${summary.assignmentRate}% on bus` }}
        />

        {/* Vehicle-km Avoided */}
        <MetricCard
          title="Vehicle-km Avoided"
          value={impact.vehicleKmAvoided.toLocaleString()}
          subtitle={`${impact.tripsAvoided} dedicated trips prevented`}
          icon={<Truck className="h-6 w-6 text-blue-600" />}
          color="blue"
          highlight="≈ 0 additional vehicle-km"
        />

        {/* CO2 Saved */}
        <MetricCard
          title="CO2 Avoided"
          value={`${impact.co2AvoidedTonnes} tonnes`}
          subtitle={`${impact.co2AvoidedKg} kg total`}
          icon={<Leaf className="h-6 w-6 text-green-600" />}
          color="green"
        />

        {/* Total Consignments */}
        <MetricCard
          title="Total Consignments"
          value={summary.totalConsignments}
          subtitle={`${summary.assignedToBus} on bus • ${summary.reroutedToFleet} fleet`}
          icon={<Package className="h-6 w-6 text-gray-600" />}
          color="gray"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h3>
          <div className="space-y-3">
            {Object.entries(breakdown.byStatus).map(([status, count]) => {
              if (status === 'total' || count === 0) return null;
              
              const percentage = Math.round((count / summary.totalConsignments) * 100);
              
              return (
                <div key={status} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize text-gray-700">{status.replace(/_/g, ' ')}</span>
                    <span className="font-semibold text-gray-900">{count} ({percentage}%)</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getStatusColor(status)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cargo Class Breakdown */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cargo Class Distribution</h3>
          <div className="space-y-3">
            {Object.entries(breakdown.byClass).map(([cls, count]) => {
              if (count === 0) return null;
              
              const percentage = Math.round((count / summary.totalConsignments) * 100);
              const classNames = {
                A: 'Agricultural',
                B: 'General Parcels',
                C: 'Institutional',
                D: 'Not Bus-Eligible'
              };
              
              return (
                <div key={cls} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">Class {cls} - {classNames[cls]}</span>
                    <span className="font-semibold text-gray-900">{count} ({percentage}%)</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getClassColor(cls)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Daily Trends */}
      {trends && trends.daily && trends.daily.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Trends</h3>
          <div className="space-y-2">
            {trends.daily.map((day) => (
              <div key={day.date} className="flex items-center gap-4 p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-2 w-32">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total:</span>
                    <span className="ml-2 font-semibold text-gray-900">{day.total}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Assigned:</span>
                    <span className="ml-2 font-semibold text-green-700">{day.assigned}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Rate:</span>
                    <span className="ml-2 font-semibold text-blue-700">{day.assignmentRate}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Utilization Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Capacity Utilization</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-600 mb-1">Total Weight Handled</div>
            <div className="text-2xl font-bold text-gray-900">{utilization.totalWeightKg} kg</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Bus Network</div>
            <div className="text-2xl font-bold text-green-700">{utilization.assignedWeightKg} kg</div>
            <div className="text-xs text-gray-600 mt-1">{utilization.utilizationPct}% of total</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Fleet (Rerouted)</div>
            <div className="text-2xl font-bold text-yellow-700">{utilization.reroutedWeightKg} kg</div>
          </div>
        </div>
      </div>

      {/* Data Source */}
      {metrics.metadata && (
        <div className="text-xs text-gray-500 text-center">
          Data source: {metrics.metadata.dataSource} • Last updated: {new Date(metrics.metadata.calculatedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
};

const MetricCard = ({ title, value, subtitle, icon, color, trend, highlight }) => {
  const colors = {
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    gray: 'bg-gray-50 border-gray-200',
  };

  return (
    <div className={`border rounded-lg p-4 ${colors[color]}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-600">{title}</div>
        </div>
        <div className="flex-shrink-0">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      {subtitle && <div className="text-xs text-gray-600">{subtitle}</div>}
      {highlight && (
        <div className="mt-2 text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded">
          {highlight}
        </div>
      )}
      {trend && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          <TrendingUp className="h-3 w-3 text-green-600" />
          <span className="text-green-700 font-medium">{trend.label}</span>
        </div>
      )}
    </div>
  );
};

const getStatusColor = (status) => {
  const colors = {
    assigned: 'bg-blue-500',
    in_transit: 'bg-green-500',
    delivered: 'bg-green-600',
    rerouted_to_fleet: 'bg-yellow-500',
    rejected: 'bg-red-500',
    cancelled: 'bg-gray-500',
  };
  return colors[status] || 'bg-gray-400';
};

const getClassColor = (cls) => {
  const colors = {
    A: 'bg-green-500',
    B: 'bg-blue-500',
    C: 'bg-purple-500',
    D: 'bg-red-500',
  };
  return colors[cls] || 'bg-gray-400';
};

export default ImpactDashboard;
