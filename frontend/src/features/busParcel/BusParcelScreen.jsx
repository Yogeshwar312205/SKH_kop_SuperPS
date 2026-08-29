import React, { useState } from 'react';
import { Package, TrendingUp, History, BookOpen } from 'lucide-react';
import { ConsignmentForm } from './ConsignmentForm';
import { ImpactDashboard } from './ImpactDashboard';
import { BookingHistory } from './BookingHistory';
import { NetworkVisualization } from './NetworkVisualization';

/**
 * Bus-Parcel System Screen — Main entry point
 * 
 * Four tabs:
 * 1. Book Consignment (enhanced form with commodity intelligence + route preview)
 * 2. Booking History (my consignments with tracking)
 * 3. Impact Dashboard (real-time metrics from database)
 * 4. Bus Network (stops, routes, live trips)
 */
export const BusParcelScreen = () => {
  const [activeTab, setActiveTab] = useState('book');

  const tabs = [
    { id: 'book', label: 'Book Consignment', icon: Package },
    { id: 'history', label: 'My Bookings', icon: History },
    { id: 'impact', label: 'Impact Dashboard', icon: TrendingUp },
    { id: 'network', label: 'Bus Network', icon: BookOpen },
  ];

  return (
    <div className="space-y-6 pt-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-800/20 bg-gradient-to-r from-emerald-50 via-white to-green-50/40 p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">Eco Cargo Transit</span>
          </div>
          <h1 className="text-2xl font-bold text-ink mt-1">Passenger Bus-Parcel Logistics</h1>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Send cargo on passenger buses • Zero extra vehicles • Save up to 62%
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm">
        <nav className="flex flex-wrap gap-1.5" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex flex-1 items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-150
                  ${isActive
                    ? 'bg-gradient-to-r from-forest-700 to-forest-800 text-white shadow-md shadow-forest-900/10'
                    : 'text-slate-600 hover:text-forest-800 hover:bg-slate-50'
                  }
                `}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-300' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="py-4">
        {activeTab === 'book' && <ConsignmentForm />}
        {activeTab === 'history' && <BookingHistory />}
        {activeTab === 'impact' && <ImpactDashboard />}
        {activeTab === 'network' && <NetworkVisualization />}
      </div>
    </div>
  );
};

export default BusParcelScreen;
