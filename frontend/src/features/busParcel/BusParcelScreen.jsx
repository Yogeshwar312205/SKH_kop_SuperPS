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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bus-Parcel System</h1>
          <p className="text-sm text-gray-600 mt-1">
            Send cargo on passenger buses • Zero extra vehicles • Save up to 62%
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${isActive
                    ? 'border-green-600 text-green-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
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
