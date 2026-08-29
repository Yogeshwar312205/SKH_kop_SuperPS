import { useState, useEffect, useRef } from 'react';
import { getSystemHealth } from '../../services/api';
import { getSocket } from '../../services/socket';

/**
 * System Health Hook
 * 
 * Polls /api/system/health every 2 seconds and subscribes to
 * system:recovery_progress socket events for live recovery updates.
 * 
 * Pattern follows data/marketCache.js (polling) + 
 * hooks/useVehicleTracking.js (socket subscription)
 */
export const useSystemHealth = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recoveryProgress, setRecoveryProgress] = useState(null);
  
  const pollInterval = useRef(null);
  const isSubscribed = useRef(false);

  // Fetch health
  const fetchHealth = async () => {
    try {
      const data = await getSystemHealth();
      setHealth(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Start polling
  const startPolling = () => {
    if (pollInterval.current) return;

    // Initial fetch
    fetchHealth();

    // Poll every 2 seconds
    pollInterval.current = setInterval(() => {
      fetchHealth();
    }, 2000);
  };

  // Stop polling
  const stopPolling = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
  };

  // Subscribe to recovery progress
  const subscribeToRecovery = () => {
    if (isSubscribed.current) return;

    const socket = getSocket();
    socket.on('system:recovery_progress', (progress) => {
      setRecoveryProgress(progress);
      
      // If recovery complete, clear progress after showing result
      if (progress.step === 'complete' || progress.step === 'error') {
        setTimeout(() => {
          setRecoveryProgress(null);
        }, 5000);
      }
    });

    isSubscribed.current = true;
  };

  // Unsubscribe from recovery progress
  const unsubscribeFromRecovery = () => {
    if (!isSubscribed.current) return;

    const socket = getSocket();
    socket.off('system:recovery_progress');
    isSubscribed.current = false;
  };

  // Setup on mount
  useEffect(() => {
    startPolling();
    subscribeToRecovery();

    return () => {
      stopPolling();
      unsubscribeFromRecovery();
    };
  }, []);

  // Refresh on demand
  const refresh = () => {
    setLoading(true);
    fetchHealth();
  };

  return {
    health,
    loading,
    error,
    recoveryProgress,
    refresh
  };
};
