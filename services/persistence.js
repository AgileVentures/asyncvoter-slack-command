// services/persistence.js
'use strict'

// Factory for persistence layer modules
// Gives support for multiple persistence stores
// Persistence layer modules must export { del, set, flushdb, get }


module.exports = (store, options) => {

  // TODO: Warning - is this a dangerous type of reflection?!
  // Error catching??
  if (store && typeof store == 'string' && store.length > 0)
    return require('./persistence/' + store);

  // return getPersistenceStore(x.store || 'redis');
  //return redis
  console.warn('Not sure what persistence to use - defaulting back to redis')
  return require('./persistence/redis')

}
