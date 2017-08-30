// services/persistence.js
'use strict'

// Factory for persistence layer modules
// Gives support for multiple persistence stores
// Persistence layer modules are facades to the actual persistence objects & functions
// A persistence object must contain: { setupVote, giveVote, getVotes, deleteAllData }


module.exports = (store, options) => {

  const storeDefined = store && typeof store == 'string' && store.length > 0

  if (!storeDefined) console.warn('Not sure what persistence to use - defaulting back to redis')

  const moduleName = './persistence/' + (storeDefined ? store : 'redis')

  const persistence = require(moduleName)(options)

  // NO destruction of non-test databases
  if (process.env.NODE_ENV != 'test') delete persistence.deleteAllData

  return persistence

}
