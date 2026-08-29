/**
 * Recovery State Manager - Global state for resilience system
 * 
 * Tracks whether the system is:
 * - idle: Normal operation
 * - blackout: Database corruption detected
 * - recovering: Recovery in progress
 * 
 * Used by guardWrites middleware and recovery service.
 */

class RecoveryState {
  constructor() {
    this.state = 'idle'; // 'idle' | 'blackout' | 'recovering'
  }

  /**
   * Get current state
   */
  get() {
    return this.state;
  }

  /**
   * Set new state
   */
  set(newState) {
    const validStates = ['idle', 'blackout', 'recovering'];
    if (!validStates.includes(newState)) {
      throw new Error(`Invalid state: ${newState}. Must be one of: ${validStates.join(', ')}`);
    }
    this.state = newState;
  }

  /**
   * Check if state matches
   */
  is(state) {
    return this.state === state;
  }

  /**
   * Check if system is in recovery mode (blackout or recovering)
   */
  isRecoveryMode() {
    return this.state === 'blackout' || this.state === 'recovering';
  }
}

// Singleton instance
const recoveryState = new RecoveryState();

module.exports = recoveryState;
