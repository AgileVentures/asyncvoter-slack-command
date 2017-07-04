// services/persistence.js
'use strict'

// Factory for persistence layer modules
// Gives support for multiple persistence stores
// Persistence layer modules are facades to the actual persistence objects & functions
// A persistence object must contain: { getName, setupVote, giveVote, getVotes, deleteAllData }
// IMPORTANT: deleteAllData should only be available during testing


const config = require('config')

module.exports = (store, options) => {

  const storeDefined = store && typeof store == 'string' && store.length > 0

  const storeToUse = storeDefined ? store : config.persistence.default
  const moduleName = './persistence/' + storeToUse

  const persistence = require(moduleName)(options)

  // Remove deleteAllData when not testing
  if (process.env.NODE_ENV != 'test') delete persistence.deleteAllData


  return persistence

}
