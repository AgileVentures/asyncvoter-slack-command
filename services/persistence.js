// services/persistence.js
'use strict'

// Factory for persistence layer modules
// Gives support for multiple persistence stores
// Persistence layer modules are facades to the actual persistence objects & functions
// A persistence object must contain: { getName, setupVote, giveVote, getVotes, deleteAllData }

const config = require('config')

module.exports = (store, options) => {

  const storeDefined = store && typeof store == 'string' && store.length > 0

  const storeToUse = storeDefined ? store : (config.persistence.default || 'redis')
  console.log("Using persistence store: " + storeToUse)
  const moduleName = './persistence/' + storeToUse

  const persistence = require(moduleName)(options)

  // NO destruction of non-test databases
  if (process.env.NODE_ENV != 'test') delete persistence.deleteAllData
  return persistence

}
