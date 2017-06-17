// persistence-service.js
'use strict'

// Create services which can be dependency injected into
// the persistence layer thus most persistence stores can be
// used for asyncvoter

// Format for persistence layer objects


// TODO: create function to figure out which store to initialise
// and inject.



module.exports = (store, options) => {

  // TODO: Warning - is this a dangerous type of reflection?!
  if (store && typeof store == 'string' && store.length > 0)
    return require('./' + store + '-persistence');

  // return getPersistenceStore(x.store || 'redis');
  //return redis
  console.warn('Not sure what persistence to use - defaulting back to redis')
  return require('./redis-persistence')

}
