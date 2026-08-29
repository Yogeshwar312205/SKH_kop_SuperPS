import React, { useState, useEffect } from 'react';

/**
 * EV Charging Siting Panel (§10.6).
 */
export const EVSitingPanel = () => {
  const [candidates, setCandidates] = useState([]);

  useEffect(() => {
    // TODO: P4 fetch apiV2.getCandidates()
    setCandidates([
      { id: '1', name: 'Kopargaon ST Depot', siteType: 'bus-depot', totalScore: 90, selected: true },
      { id: '2', name: 'Shirdi Bus Stand', siteType: 'major-stop', totalScore: 74, selected: true },
    ]);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">EV Charging Siting</h1>
      <div className="space-y-2">
        {candidates.map((c) => (
          <div key={c.id} className={`border rounded p-4 ${c.selected ? 'bg-green-50' : ''}`}>
            <h3 className="font-semibold">{c.name}</h3>
            <p className="text-sm text-gray-600">{c.siteType} • Score: {c.totalScore}</p>
            {c.selected && <span className="text-xs text-green-600 font-semibold">SELECTED</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EVSitingPanel;
