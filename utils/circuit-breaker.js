/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by opening circuit after threshold failures
 */

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.halfOpenMaxAttempts = options.halfOpenMaxAttempts || 3;
    
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.halfOpenAttempts = 0;

    console.log(`⚡ [Circuit Breaker] Initialized for ${name} (threshold: ${this.failureThreshold}, reset: ${this.resetTimeout}ms)`);
  }

  /**
   * Check if we can attempt a request
   */
  canAttempt() {
    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'OPEN') {
      // Check if enough time has passed to try HALF_OPEN
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure >= this.resetTimeout) {
        this._transitionTo('HALF_OPEN');
        return true;
      }
      return false;
    }

    if (this.state === 'HALF_OPEN') {
      // Allow limited attempts in HALF_OPEN state
      return this.halfOpenAttempts < this.halfOpenMaxAttempts;
    }

    return false;
  }

  /**
   * Record successful request
   */
  recordSuccess() {
    this.successCount++;

    if (this.state === 'HALF_OPEN') {
      // Successful request in HALF_OPEN - reset to CLOSED
      console.log(`✅ [Circuit Breaker] ${this.name}: HALF_OPEN → CLOSED (recovery successful)`);
      this._transitionTo('CLOSED');
      this.failureCount = 0;
      this.halfOpenAttempts = 0;
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  /**
   * Record failed request
   */
  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.halfOpenMaxAttempts) {
        console.log(`❌ [Circuit Breaker] ${this.name}: HALF_OPEN → OPEN (recovery failed)`);
        this._transitionTo('OPEN');
        this.halfOpenAttempts = 0;
      }
    } else if (this.state === 'CLOSED') {
      if (this.failureCount >= this.failureThreshold) {
        console.log(`⚠️  [Circuit Breaker] ${this.name}: CLOSED → OPEN (threshold reached: ${this.failureCount}/${this.failureThreshold})`);
        this._transitionTo('OPEN');
      }
    }
  }

  /**
   * Transition to new state
   */
  _transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;
    
    if (newState === 'CLOSED') {
      this.failureCount = 0;
      this.halfOpenAttempts = 0;
    }
  }

  /**
   * Get current state
   */
  getState() {
    return this.state;
  }

  /**
   * Force reset (for testing/manual intervention)
   */
  reset() {
    console.log(`🔄 [Circuit Breaker] ${this.name}: Manual reset to CLOSED`);
    this._transitionTo('CLOSED');
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenAttempts = 0;
    this.lastFailureTime = null;
  }

  /**
   * Get status summary
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      canAttempt: this.canAttempt()
    };
  }
}

module.exports = CircuitBreaker;
