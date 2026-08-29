import React, { useState, useEffect } from 'react';

/**
 * Weather Panel (§10.5) — Weather risk, manual override for demo.
 */
export const WeatherPanel = () => {
  const [environment, setEnvironment] = useState(null);

  useEffect(() => {
    // TODO: P4 fetch apiV2.getEnvironment()
    setEnvironment({ source: 'open-meteo', tempC: 28.5, humidityPct: 65, rainProbPct: 30 });
  }, []);

  if (!environment) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Environment</h1>
      <div className="border rounded p-4">
        <h3 className="font-semibold mb-2">Current Weather</h3>
        <p>Temperature: {environment.tempC}°C</p>
        <p>Humidity: {environment.humidityPct}%</p>
        <p>Rain Probability: {environment.rainProbPct}%</p>
        <div className="mt-3">
          <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${
            environment.rainProbPct > 70 ? 'bg-red-100 text-red-700' :
            environment.rainProbPct > 40 ? 'bg-yellow-100 text-yellow-700' :
            'bg-green-100 text-green-700'
          }`}>
            {environment.rainProbPct > 70 ? 'HIGH' : environment.rainProbPct > 40 ? 'MEDIUM' : 'LOW'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default WeatherPanel;
