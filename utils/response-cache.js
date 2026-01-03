/**
 * Response Cache Manager
 * Multi-level caching: Memory → File-based
 * Intelligent TTL based on content type
 */

const NodeCache = require('node-cache');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class ResponseCache {
  constructor(options = {}) {
    // In-memory cache (fast, for recent queries)
    this.memoryCache = new NodeCache({
      stdTTL: options.defaultTTL || 3600, // 1 hour default
      checkperiod: 120, // Check for expired keys every 2 minutes
      maxKeys: options.maxKeys || 500 // Limit memory usage
    });

    // File-based cache settings
    this.enableFileCache = options.enableFileCache !== false;
    this.cacheDir = options.cacheDir || path.join(__dirname, '../.cache');
    this.fileCacheTTL = options.fileCacheTTL || 86400; // 24 hours for file cache

    // Statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      memoryHits: 0,
      fileHits: 0
    };

    // TTL by content type (in seconds)
    this.ttlRules = {
      faq: 86400,           // 24 hours - rarely changes
      business_info: 43200, // 12 hours - pricing, services
      greeting: 3600,       // 1 hour - greetings, acknowledgments
      dynamic: 900,         // 15 minutes - personalized content
      default: 3600         // 1 hour - general queries
    };

    // Initialize file cache directory
    this._initFileCacheDir();
  }

  /**
   * Get cached response
   */
  async get(key) {
    const hashedKey = this._hashKey(key);

    // Check memory cache first (fastest)
    const memoryResult = this.memoryCache.get(hashedKey);
    if (memoryResult) {
      this.stats.hits++;
      this.stats.memoryHits++;
      console.log(`✅ [Cache] Memory hit: ${key.substring(0, 40)}...`);
      return memoryResult;
    }

    // Check file cache (slower but persistent)
    if (this.enableFileCache) {
      try {
        const fileResult = await this._getFromFile(hashedKey);
        if (fileResult) {
          // Promote to memory cache
          this.memoryCache.set(hashedKey, fileResult, this._determineTTL(fileResult));
          this.stats.hits++;
          this.stats.fileHits++;
          console.log(`✅ [Cache] File hit (promoted to memory): ${key.substring(0, 40)}...`);
          return fileResult;
        }
      } catch (error) {
        // File cache miss or error - not critical
        console.log(`⚠️  [Cache] File read error: ${error.message}`);
      }
    }

    // Cache miss
    this.stats.misses++;
    console.log(`❌ [Cache] Miss: ${key.substring(0, 40)}...`);
    return null;
  }

  /**
   * Set cached response
   */
  async set(key, value, ttl) {
    const hashedKey = this._hashKey(key);
    
    // Determine TTL based on content
    const effectiveTTL = ttl || this._determineTTL(value);

    // Add metadata
    const cacheEntry = {
      ...value,
      cachedAt: Date.now(),
      expiresAt: Date.now() + (effectiveTTL * 1000)
    };

    // Store in memory cache
    this.memoryCache.set(hashedKey, cacheEntry, effectiveTTL);
    this.stats.sets++;

    // Store in file cache (async, non-blocking)
    if (this.enableFileCache) {
      this._setToFile(hashedKey, cacheEntry).catch(error => {
        console.warn(`⚠️  [Cache] File write error: ${error.message}`);
      });
    }

    console.log(`💾 [Cache] Stored: ${key.substring(0, 40)}... (TTL: ${effectiveTTL}s)`);
  }

  /**
   * Determine TTL based on content characteristics
   */
  _determineTTL(value) {
    const text = value.text?.toLowerCase() || '';

    // FAQ patterns (long TTL)
    if (text.match(/price|cost|rate|hour|day|available|open|close/i)) {
      return this.ttlRules.business_info;
    }

    // Greetings (medium TTL)
    if (text.match(/hello|hi|hey|thank|welcome|greet/i)) {
      return this.ttlRules.greeting;
    }

    // Check if it's personalized (short TTL)
    if (value.senderName || text.includes('you') || text.includes('your')) {
      return this.ttlRules.dynamic;
    }

    // Default TTL
    return this.ttlRules.default;
  }

  /**
   * Hash cache key for consistent storage
   */
  _hashKey(key) {
    return crypto.createHash('md5').update(key).digest('hex');
  }

  /**
   * Initialize file cache directory
   */
  async _initFileCacheDir() {
    if (!this.enableFileCache) return;

    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      console.log(`📁 [Cache] File cache directory ready: ${this.cacheDir}`);
    } catch (error) {
      console.error(`❌ [Cache] Failed to create cache directory: ${error.message}`);
      this.enableFileCache = false;
    }
  }

  /**
   * Get from file cache
   */
  async _getFromFile(hashedKey) {
    const filePath = path.join(this.cacheDir, `${hashedKey}.json`);
    
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const entry = JSON.parse(data);

      // Check if expired
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        // Clean up expired file
        await fs.unlink(filePath).catch(() => {});
        return null;
      }

      return entry;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn(`⚠️  [Cache] File read error: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Set to file cache
   */
  async _setToFile(hashedKey, value) {
    if (!this.enableFileCache) return;

    const filePath = path.join(this.cacheDir, `${hashedKey}.json`);
    
    try {
      await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
    } catch (error) {
      console.warn(`⚠️  [Cache] File write error: ${error.message}`);
    }
  }

  /**
   * Clear entire cache
   */
  async clear() {
    // Clear memory cache
    this.memoryCache.flushAll();
    console.log(`🗑️  [Cache] Memory cache cleared`);

    // Clear file cache
    if (this.enableFileCache) {
      try {
        const files = await fs.readdir(this.cacheDir);
        await Promise.all(
          files
            .filter(f => f.endsWith('.json'))
            .map(f => fs.unlink(path.join(this.cacheDir, f)))
        );
        console.log(`🗑️  [Cache] File cache cleared (${files.length} files)`);
      } catch (error) {
        console.warn(`⚠️  [Cache] Error clearing file cache: ${error.message}`);
      }
    }

    // Reset stats
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      memoryHits: 0,
      fileHits: 0
    };
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 
      ? ((this.stats.hits / totalRequests) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      totalRequests,
      hitRate: `${hitRate}%`,
      memoryCacheSize: this.memoryCache.keys().length,
      memoryCacheStats: this.memoryCache.getStats()
    };
  }

  /**
   * Clean up expired entries
   */
  async cleanup() {
    // Memory cache auto-cleans via checkperiod
    
    // File cache cleanup
    if (!this.enableFileCache) return;

    try {
      const files = await fs.readdir(this.cacheDir);
      let cleaned = 0;

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(this.cacheDir, file);
        try {
          const data = await fs.readFile(filePath, 'utf8');
          const entry = JSON.parse(data);

          if (entry.expiresAt && Date.now() > entry.expiresAt) {
            await fs.unlink(filePath);
            cleaned++;
          }
        } catch (error) {
          // If file is corrupted, delete it
          await fs.unlink(filePath).catch(() => {});
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`🧹 [Cache] Cleaned up ${cleaned} expired file cache entries`);
      }
    } catch (error) {
      console.warn(`⚠️  [Cache] Cleanup error: ${error.message}`);
    }
  }
}

module.exports = ResponseCache;
