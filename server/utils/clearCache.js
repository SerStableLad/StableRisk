import NodeCache from 'node-cache';

export function clearAllCaches() {
  // Get all NodeCache instances
  const caches = [
    require('../services/auditService.js').cache,
    require('../services/coinGeckoService.js').cache,
    require('../services/liquidityService.js').cache,
    require('../services/pegService.js').cache,
    require('../services/transparencyService.js').cache
  ];

  // Clear each cache
  caches.forEach(cache => {
    if (cache instanceof NodeCache) {
      cache.flushAll();
    }
  });

  console.log('All server-side caches cleared');
}