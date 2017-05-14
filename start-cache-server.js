var multilevelCacheTools = require('multilevel-cache-tools');

multilevelCacheTools.server.create(
  {
    dbPath: 'cache.db',
    port: 3030
  },
  function done() {
    console.log('Cache server started at port 3030.');
  }
);
