import React, { useState } from 'react';

/**
 * Scenario Control (§10.7) — The ADAPTATION requirement.
 */
export const ScenarioControl = () => {
  const [activeScenario, setActiveScenario] = useState(null);

  const scenarios = [
    { type: 'trip_cancelled', label: 'Vehicle Out', icon: '🚫' },
    { type: 'road_closed', label: 'Road Closure', icon: '🚧' },
    { type: 'demand_spike', label: 'Demand Spike', icon: '📈' },
    { type: 'weather', label: 'Heavy Rain', icon: '🌧️' },
    { type: 'congestion', label: 'Congestion', icon: '🚗' },
  ];

  const applyScenario = async (scenario) => {
    // TODO: P4 call apiV2.applyScenario(), listen to socket events
    setTimeout(() => setActiveScenario(scenario), 500);
  };

  const resetScenarios = async () => {
    // TODO: P4 call apiV2.resetScenarios()
    setActiveScenario(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Scenarios</h1>
        {activeScenario && <button onClick={resetScenarios} className="px-4 py-2 bg-gray-600 text-white rounded">Reset</button>}
      </div>
      {activeScenario && (
        <div className="bg-yellow-50 border border-yellow-300 rounded p-4">
          <p className="font-semibold">Active: {activeScenario.icon} {activeScenario.label}</p>
        </div>
      )}
      <div className="grid grid-cols-3 gap-4">
        {scenarios.map((s) => (
          <button key={s.type} onClick={() => applyScenario(s)} className="border rounded p-4 hover:bg-gray-50">
            <div className="text-3xl">{s.icon}</div>
            <p className="text-sm font-semibold mt-2">{s.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ScenarioControl;
