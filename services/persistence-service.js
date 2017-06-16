// persistence-service.js
'use strict'

// Create services which can be dependency injected into
// the persistence layer thus most persistence stores can be
// used for asyncvoter

// Format for persistence layer objects


// const redis = require('./redis-persistence')
const redis = require('./redis-persistence')

// TODO: create function to figure out which store to initialise
// and inject.

// const immutable = require('immutable')

// const repoMap = immutable.Map({
//   redis: require('redis'),
// })


module.exports = (x) => {
  if (!x || x.length == 0 || !x.store) {
    console.log('No data store specified - using Redis')
  }

  if (x.store !== 'redis') {
    console.log('No other persistence layers available - using Redis')
  }

  // return getPersistenceStore(x.store || 'redis');
  return redis

}
