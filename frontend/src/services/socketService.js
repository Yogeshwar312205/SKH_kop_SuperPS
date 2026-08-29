/**
 * Socket Service — WebSocket connection for real-time updates.
 * 
 * Connects to /v2 namespace on backend Socket.io server.
 * Emits events: trip:updated, consignment:reassigned, consignment:rerouted,
 * environment:changed, scenario:applied, optimize:progress
 */

import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.connected = false;
  }

  /**
   * Connect to Socket.io server.
   * @param {string} url - Backend URL (default: http://localhost:5000)
   * @param {string} token - JWT authentication token
   */
  connect(url = 'http://localhost:5000', token = null) {
    if (this.socket) {
      console.warn('Socket already connected');
      return;
    }

    this.socket = io(url + '/v2', {
      auth: token ? { token } : {},
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected to /v2 namespace');
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    // Register existing listeners
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        this.socket.on(event, callback);
      });
    });
  }

  /**
   * Disconnect from Socket.io server.
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  /**
   * Subscribe to an event.
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // If socket is already connected, register the listener
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Unsubscribe from an event.
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }

    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  /**
   * Join a room (for targeted updates).
   * @param {string} room - Room name (e.g., 'consignment:123', 'trip:456')
   */
  joinRoom(room) {
    if (this.socket) {
      this.socket.emit('join', room);
    }
  }

  /**
   * Leave a room.
   * @param {string} room - Room name
   */
  leaveRoom(room) {
    if (this.socket) {
      this.socket.emit('leave', room);
    }
  }

  /**
   * Check if socket is connected.
   * @returns {boolean}
   */
  isConnected() {
    return this.connected;
  }
}

// Singleton instance
const socketService = new SocketService();

export default socketService;

/**
 * React hook for using socket events.
 * 
 * Usage:
 *   import { useSocket } from '../../services/socketService';
 *   
 *   function MyComponent() {
 *     useSocket('trip:updated', (data) => {
 *       console.log('Trip updated:', data);
 *     });
 *   }
 */
import { useEffect } from 'react';

export function useSocket(event, callback) {
  useEffect(() => {
    socketService.on(event, callback);
    return () => {
      socketService.off(event, callback);
    };
  }, [event, callback]);
}

/**
 * React hook for joining/leaving rooms.
 * 
 * Usage:
 *   import { useSocketRoom } from '../../services/socketService';
 *   
 *   function MyComponent({ consignmentId }) {
 *     useSocketRoom(`consignment:${consignmentId}`);
 *   }
 */
export function useSocketRoom(room) {
  useEffect(() => {
    if (!room) return;
    
    socketService.joinRoom(room);
    return () => {
      socketService.leaveRoom(room);
    };
  }, [room]);
}
