/**
 * Rate Limiter with Token Bucket Algorithm
 * Prevents abuse and manages API quotas
 */

const NodeCache = require('node-cache');

class RateLimiter {
  constructor(options = {}) {
    this.limits = {
      perUser: options.perUser || 30,        // Messages per window per user
      perIP: options.perIP || 100,           // Requests per window per IP
      global: options.global || 1000,        // Total requests per window
      window: options.window || 60000        // Time window (1 minute)
    };

    // Storage for rate limit tracking
    this.userLimits = new NodeCache({ stdTTL: 60, checkperiod: 10 });
    this.ipLimits = new NodeCache({ stdTTL: 60, checkperiod: 10 });
    this.globalCounter = { count: 0, resetAt: Date.now() + this.limits.window };

    // API quota tracking (for external APIs)
    this.apiQuotas = {
      groq: { limit: 14400, used: 0, resetAt: Date.now() + 86400000 }, // 14,400/day
      gemini: { limit: 1500, used: 0, resetAt: Date.now() + 60000 },   // 1,500/min
      ollama: { limit: Infinity, used: 0 }  // No limit (local)
    };

    console.log(`🚦 [Rate Limiter] Initialized (per user: ${this.limits.perUser}, window: ${this.limits.window}ms)`);
  }

  /**
   * Check if request is allowed
   */
  async checkLimit(userId, ipAddress) {
    // Check global limit
    if (!this._checkGlobalLimit()) {
      console.warn(`⚠️  [Rate Limiter] Global limit exceeded`);
      return {
        allowed: false,
        reason: 'global_limit',
        retryAfter: this._getRetryAfter(this.globalCounter.resetAt)
      };
    }

    // Check per-user limit
    const userCheck = this._checkUserLimit(userId);
    if (!userCheck.allowed) {
      console.warn(`⚠️  [Rate Limiter] User limit exceeded: ${userId}`);
      return userCheck;
    }

    // Check per-IP limit (if provided)
    if (ipAddress) {
      const ipCheck = this._checkIPLimit(ipAddress);
      if (!ipCheck.allowed) {
        console.warn(`⚠️  [Rate Limiter] IP limit exceeded: ${ipAddress}`);
        return ipCheck;
      }
    }

    return { allowed: true };
  }

  /**
   * Record request (increment counters)
   */
  async recordRequest(userId, ipAddress, provider = 'groq') {
    // Increment global counter
    this.globalCounter.count++;

    // Increment user counter
    const userCount = this.userLimits.get(userId) || 0;
    this.userLimits.set(userId, userCount + 1);

    // Increment IP counter
    if (ipAddress) {
      const ipCount = this.ipLimits.get(ipAddress) || 0;
      this.ipLimits.set(ipAddress, ipCount + 1);
    }

    // Track API quota
    if (this.apiQuotas[provider]) {
      this.apiQuotas[provider].used++;
      this._checkQuotaReset(provider);
    }

    console.log(`📊 [Rate Limiter] Recorded: user=${userId}, ip=${ipAddress}, provider=${provider}`);
  }

  /**
   * Check global limit
   */
  _checkGlobalLimit() {
    // Reset counter if window expired
    if (Date.now() > this.globalCounter.resetAt) {
      this.globalCounter.count = 0;
      this.globalCounter.resetAt = Date.now() + this.limits.window;
    }

    return this.globalCounter.count < this.limits.global;
  }

  /**
   * Check per-user limit
   */
  _checkUserLimit(userId) {
    const count = this.userLimits.get(userId) || 0;
    
    if (count >= this.limits.perUser) {
      return {
        allowed: false,
        reason: 'user_limit',
        current: count,
        limit: this.limits.perUser,
        retryAfter: this._getRetryAfter(Date.now() + this.limits.window)
      };
    }

    return { allowed: true, current: count, limit: this.limits.perUser };
  }

  /**
   * Check per-IP limit
   */
  _checkIPLimit(ipAddress) {
    const count = this.ipLimits.get(ipAddress) || 0;
    
    if (count >= this.limits.perIP) {
      return {
        allowed: false,
        reason: 'ip_limit',
        current: count,
        limit: this.limits.perIP,
        retryAfter: this._getRetryAfter(Date.now() + this.limits.window)
      };
    }

    return { allowed: true, current: count, limit: this.limits.perIP };
  }

  /**
   * Check if API provider has quota remaining
   */
  checkAPIQuota(provider) {
    const quota = this.apiQuotas[provider];
    if (!quota) return { available: true };

    this._checkQuotaReset(provider);

    const remaining = quota.limit - quota.used;
    const available = remaining > 0;

    if (!available) {
      console.warn(`⚠️  [Rate Limiter] ${provider} quota exhausted (${quota.used}/${quota.limit})`);
    }

    return {
      available,
      used: quota.used,
      limit: quota.limit,
      remaining,
      resetAt: quota.resetAt
    };
  }

  /**
   * Reset quota if time window expired
   */
  _checkQuotaReset(provider) {
    const quota = this.apiQuotas[provider];
    if (!quota || !quota.resetAt) return;

    if (Date.now() > quota.resetAt) {
      console.log(`🔄 [Rate Limiter] Resetting ${provider} quota`);
      quota.used = 0;
      
      // Set next reset time based on provider
      if (provider === 'groq') {
        quota.resetAt = Date.now() + 86400000; // 24 hours
      } else if (provider === 'gemini') {
        quota.resetAt = Date.now() + 60000; // 1 minute
      }
    }
  }

  /**
   * Calculate retry-after time in seconds
   */
  _getRetryAfter(resetAt) {
    return Math.ceil((resetAt - Date.now()) / 1000);
  }

  /**
   * Get rate limit status for user
   */
  getUserStatus(userId) {
    const count = this.userLimits.get(userId) || 0;
    return {
      used: count,
      limit: this.limits.perUser,
      remaining: Math.max(0, this.limits.perUser - count),
      resetIn: this.limits.window / 1000 // seconds
    };
  }

  /**
   * Get overall statistics
   */
  getStats() {
    return {
      global: {
        count: this.globalCounter.count,
        limit: this.limits.global,
        resetAt: new Date(this.globalCounter.resetAt).toISOString()
      },
      activeUsers: this.userLimits.keys().length,
      activeIPs: this.ipLimits.keys().length,
      apiQuotas: Object.entries(this.apiQuotas).reduce((acc, [provider, quota]) => {
        acc[provider] = {
          used: quota.used,
          limit: quota.limit === Infinity ? 'unlimited' : quota.limit,
          remaining: quota.limit === Infinity ? 'unlimited' : quota.limit - quota.used,
          resetAt: quota.resetAt ? new Date(quota.resetAt).toISOString() : null
        };
        return acc;
      }, {})
    };
  }

  /**
   * Reset all limits (for testing/admin)
   */
  reset() {
    this.userLimits.flushAll();
    this.ipLimits.flushAll();
    this.globalCounter = { count: 0, resetAt: Date.now() + this.limits.window };
    
    Object.keys(this.apiQuotas).forEach(provider => {
      this.apiQuotas[provider].used = 0;
    });

    console.log(`🔄 [Rate Limiter] All limits reset`);
  }

  /**
   * Whitelist a user (unlimited access)
   */
  whitelist(userId) {
    console.log(`✅ [Rate Limiter] Whitelisted user: ${userId}`);
    // Set a very high limit (effectively unlimited)
    this.userLimits.set(userId, -999999);
  }

  /**
   * Blacklist a user (block all access)
   */
  blacklist(userId) {
    console.log(`🚫 [Rate Limiter] Blacklisted user: ${userId}`);
    // Set to max limit
    this.userLimits.set(userId, this.limits.perUser);
  }
}

module.exports = RateLimiter;
