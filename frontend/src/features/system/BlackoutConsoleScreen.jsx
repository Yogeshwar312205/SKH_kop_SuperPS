import React, { useState } from 'react';
import { ArrowLeft, Database, Activity, Zap, AlertTriangle, CheckCircle, Loader, Info } from 'lucide-react';
import { useSystemHealth } from './useSystemHealth';
import { seedDrillData, simulateBlackout, recoverSystem, resetDrill } from '../../services/api';

/**
 * Blackout Console Screen - Live Demo of Database Resilience
 * 
 * Pre-auth accessible (copying VrpSimulationScreen pattern).
 * Shows live database corruption detection and recovery.
 * 
 * Flow:
 * 1. Clean state → all green lights
 * 2. Seed drill data → add test records
 * 3. Simulate blackout → delete + corrupt data
 * 4. Recover system → rebuild from snapshots + events
 * 5. Reset drill → clean up for next run
 */
export const BlackoutConsoleScreen = ({ onExit }) => {
  const { health, loading, recoveryProgress, refresh } = useSystemHealth();
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [lastAction, setLastAction] = useState(null);

  const handleSeedData = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const result = await seedDrillData();
      setLastAction({ type: 'seed', result });
      refresh();
    } catch (error) {
      setActionError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulateBlackout = async () => {
    if (!window.confirm('This will corrupt drill data. Continue?')) return;
    
    setActionLoading(true);
    setActionError(null);
    try {
      const result = await simulateBlackout();
      setLastAction({ type: 'blackout', result });
      refresh();
    } catch (error) {
      setActionError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecover = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const result = await recoverSystem();
      setLastAction({ type: 'recover', result });
      refresh();
    } catch (error) {
      setActionError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('This will delete all drill data. Continue?')) return;
    
    setActionLoading(true);
    setActionError(null);
    try {
      const result = await resetDrill();
      setLastAction({ type: 'reset', result });
      refresh();
    } catch (error) {
      setActionError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'online') return 'text-green-600';
    if (status === 'degraded') return 'text-yellow-600';
    if (status === 'intact') return 'text-green-600';
    if (status === 'broken') return 'text-red-600';
    return 'text-gray-600';
  };

  const getStatusBg = (status) => {
    if (status === 'online') return 'bg-green-100';
    if (status === 'degraded') return 'bg-yellow-100';
    if (status === 'intact') return 'bg-green-100';
    if (status === 'broken') return 'bg-red-100';
    return 'bg-gray-100';
  };

  const getRecoveryColor = (state) => {
    if (state === 'idle') return 'text-gray-600';
    if (state === 'blackout') return 'text-red-600';
    if (state === 'recovering') return 'text-blue-600';
    return 'text-gray-600';
  };

  const getRecoveryBg = (state) => {
    if (state === 'idle') return 'bg-gray-100';
    if (state === 'blackout') return 'bg-red-100';
    if (state === 'recovering') return 'bg-blue-100';
    return 'bg-gray-100';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onExit}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5 text-slate-700" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Database Resilience Console
                </h1>
                <p className="text-sm text-slate-600">
                  The Blackout Challenge - Live Data Recovery Demo
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Intro Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Live Demonstration</p>
              <p>
                This console demonstrates real database corruption recovery. The system uses event sourcing
                and snapshots to survive data loss. Click <strong>Seed Drill Data</strong> to create test records,
                then <strong>Simulate Blackout</strong> to corrupt them. Watch as the system detects the corruption
                and rebuilds state from events.
              </p>
            </div>
          </div>
        </div>

        {/* Status Lights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Database Status */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${getStatusBg(health?.db)}`}>
                <Database className={`w-6 h-6 ${getStatusColor(health?.db)}`} />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Primary Database
                </div>
                <div className={`text-lg font-bold ${getStatusColor(health?.db)}`}>
                  {health?.mongoConnected ? (
                    health?.db === 'online' ? '🟢 Online' : '🟡 Degraded'
                  ) : '🔴 Offline'}
                </div>
              </div>
            </div>
            {health?.scan?.affected && health.scan.affected.length > 0 && (
              <div className="mt-3 text-xs text-red-600 bg-red-50 rounded p-2">
                <strong>{health.scan.recoverable}</strong> recoverable,{' '}
                <strong>{health.scan.unrecoverable.length}</strong> unrecoverable
              </div>
            )}
          </div>

          {/* Event Store Status */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${getStatusBg(health?.journal?.status)}`}>
                <Activity className={`w-6 h-6 ${getStatusColor(health?.journal?.status)}`} />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Event Store
                </div>
                <div className={`text-lg font-bold ${getStatusColor(health?.journal?.status)}`}>
                  {health?.journal?.chainOk ? '🟢 Intact' : '🔴 Broken'}
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-600">
              <div><strong>{health?.journal?.events?.toLocaleString() || 0}</strong> events</div>
              <div>Seq: <strong>{health?.journal?.lastSeq || 0}</strong></div>
            </div>
          </div>

          {/* Recovery Status */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${getRecoveryBg(health?.recovery)}`}>
                <Zap className={`w-6 h-6 ${getRecoveryColor(health?.recovery)}`} />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Recovery Engine
                </div>
                <div className={`text-lg font-bold ${getRecoveryColor(health?.recovery)}`}>
                  {health?.recovery === 'idle' && '⚪ Standby'}
                  {health?.recovery === 'blackout' && '🔴 Blackout'}
                  {health?.recovery === 'recovering' && '🔵 Active'}
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-600">
              <div>Snapshot: <strong>{health?.snapshot?.ageSec ? `${Math.floor(health.snapshot.ageSec / 60)} min ago` : 'None'}</strong></div>
              <div>Queued ops: <strong>{health?.queue?.pending || 0}</strong></div>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard label="Pickup Requests" value={health?.scan?.byType?.PickupRequest?.inDb || 0} />
          <MetricCard label="Vehicles" value={health?.scan?.byType?.Vehicle?.inDb || 0} />
          <MetricCard label="Users" value={health?.scan?.byType?.User?.inDb || 0} />
          <MetricCard label="Drill Scope" value={health?.drill?.scopeCount || 0} />
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={handleSeedData}
              disabled={actionLoading || health?.drill?.scopeCount > 0}
              className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold text-sm flex items-center justify-center gap-2"
            >
              {actionLoading && lastAction?.type === 'seed' ? (
                <><Loader className="w-4 h-4 animate-spin" /> Seeding...</>
              ) : (
                '🌱 Seed Drill Data'
              )}
            </button>

            <button
              onClick={handleSimulateBlackout}
              disabled={actionLoading || health?.drill?.scopeCount === 0 || health?.recovery !== 'idle'}
              className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold text-sm flex items-center justify-center gap-2"
            >
              {actionLoading && lastAction?.type === 'blackout' ? (
                <><Loader className="w-4 h-4 animate-spin" /> Corrupting...</>
              ) : (
                '💥 SIMULATE BLACKOUT'
              )}
            </button>

            <button
              onClick={handleRecover}
              disabled={actionLoading || health?.recovery === 'idle' || health?.recovery === 'recovering'}
              className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold text-sm flex items-center justify-center gap-2"
            >
              {actionLoading && lastAction?.type === 'recover' ? (
                <><Loader className="w-4 h-4 animate-spin" /> Recovering...</>
              ) : (
                '🔄 RECOVER SYSTEM'
              )}
            </button>

            <button
              onClick={handleReset}
              disabled={actionLoading || health?.drill?.scopeCount === 0}
              className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold text-sm flex items-center justify-center gap-2"
            >
              {actionLoading && lastAction?.type === 'reset' ? (
                <><Loader className="w-4 h-4 animate-spin" /> Resetting...</>
              ) : (
                '🔄 Reset Drill'
              )}
            </button>
          </div>

          {actionError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <strong>Error:</strong> {actionError}
            </div>
          )}
        </div>

        {/* Recovery Progress */}
        {recoveryProgress && (
          <RecoveryProgressCard progress={recoveryProgress} />
        )}

        {/* Last Action Result */}
        {lastAction && !recoveryProgress && (
          <ActionResultCard action={lastAction} />
        )}

      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ label, value }) => (
  <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
      {label}
    </div>
    <div className="text-2xl font-bold text-slate-900">
      {value.toLocaleString()}
    </div>
  </div>
);

// Recovery Progress Card
const RecoveryProgressCard = ({ progress }) => {
  const steps = [
    { key: 'detect', label: 'Detecting corruption' },
    { key: 'snapshot', label: 'Loading snapshot' },
    { key: 'replay', label: 'Replaying events' },
    { key: 'reconstruct', label: 'Reconstructing documents' },
    { key: 'validate', label: 'Validating data' },
    { key: 'restore', label: 'Restoring database' },
    { key: 'queue', label: 'Replaying queued operations' }
  ];

  const currentStepIndex = steps.findIndex(s => s.key === progress.step);

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm mb-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Loader className="w-5 h-5 animate-spin text-blue-600" />
        Recovery in Progress
      </h3>

      <div className="space-y-3">
        {steps.map((step, index) => {
          const isComplete = index < currentStepIndex || (index === currentStepIndex && progress.status === 'completed');
          const isCurrent = index === currentStepIndex;
          const isUpcoming = index > currentStepIndex;

          return (
            <div key={step.key} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                isComplete ? 'bg-green-100' : isCurrent ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                {isComplete ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : isCurrent ? (
                  <Loader className="w-4 h-4 animate-spin text-blue-600" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                )}
              </div>
              <div className={`text-sm ${
                isComplete ? 'text-green-700 font-medium' : 
                isCurrent ? 'text-blue-700 font-semibold' : 
                'text-gray-500'
              }`}>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>

      {progress.step === 'complete' && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-sm font-semibold text-green-900 mb-2">
            🟢 System Recovered
          </div>
          <div className="text-xs text-green-700 space-y-1">
            {progress.recovered !== undefined && <div>Recovered: <strong>{progress.recovered}</strong></div>}
            {progress.unrecoverable !== undefined && <div>Unrecoverable: <strong>{progress.unrecoverable?.length || progress.failed || 0}</strong></div>}
            {progress.consistency !== undefined && <div>Data consistency: <strong>{progress.consistency}%</strong></div>}
          </div>
        </div>
      )}

      {progress.step === 'error' && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <strong>Recovery failed:</strong> {progress.error}
        </div>
      )}
    </div>
  );
};

// Action Result Card
const ActionResultCard = ({ action }) => (
  <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
    <h3 className="text-lg font-semibold text-slate-900 mb-3">
      {action.type === 'seed' && '🌱 Drill Data Seeded'}
      {action.type === 'blackout' && '💥 Blackout Simulated'}
      {action.type === 'recover' && '🔄 Recovery Complete'}
      {action.type === 'reset' && '🔄 Drill Reset'}
    </h3>
    <pre className="text-xs bg-slate-50 p-3 rounded overflow-x-auto">
      {JSON.stringify(action.result, null, 2)}
    </pre>
  </div>
);
