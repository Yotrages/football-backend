const NodeCache = require('node-cache');

const cache = new NodeCache({
  stdTTL: 300, 
  checkperiod: 60 
});

const TTL = {
  LIVE_MATCHES: 30, 
  FIXTURES: 3600, 
  STANDINGS: 3600, 
  SINGLE_LEAGUE: 3600, 
  TODAY: 60,
  TEAM_INFO: 86400, 
  DEFAULT: 300 
};

/**
 * Wrapper function to get data with caching
 * @param {string} key - Cache key
 * @param {Function} fetchFunction - Function to fetch data if not in cache
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<any>} - Resolved data
 */
const getCachedData = async (key, fetchFunction, ttl = TTL.DEFAULT) => {
  const cachedData = cache.get(key);
  if (cachedData) {
    return cachedData;
  }

  try {
    const freshData = await fetchFunction();
    
    cache.set(key, freshData, ttl);
    
    return freshData;
  } catch (error) {
    throw error;
  }
};

/**
 * Clear cache for a specific key
 * @param {string} key - Cache key to clear
 */
const clearCache = (key) => {
  cache.del(key);
};

/**
 * Clear all cache
 */
const clearAllCache = () => {
  cache.flushAll();
};

module.exports = {
  getCachedData,
  clearCache,
  clearAllCache,
  TTL
};