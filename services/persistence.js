// services/persistence.js
'use strict'

// Factory for persistence layer modules
// Gives support for multiple persistence stores
// Persistence layer modules are facades to the actual persistence objects & functions
// A persistence object must contain: { getName, setupVote, giveVote, getVotes, deleteAllData }
// IMPORTANT: deleteAllData should only be available during testing


const config = require('config')

let instances = new Map()
let startDates = new Map()

const isTest = options => options && options.env === "test"


// Returns the single instance of the given
// persistence store
function getInstance(store, options) {
  const testing = isTest(options)
  const storeDefined = store && typeof store == 'string' && store.length > 0
  const storeToUse = storeDefined ? store : config.persistence.default
  const instanceLabel = storeToUse + (testing ? "-test" : "-production")

  if (!instances.has(instanceLabel)) {
    const moduleName = './persistence/' + storeToUse

    const persistence = require(moduleName)(options)

    // Remove deleteAllData when not testing
    if (!testing) delete persistence.deleteAllData

    instances.set(instanceLabel, persistence)
    startDates.set(instanceLabel, new Date())
  }

  return instances.get(instanceLabel)

}

// Returns undefined if unstarted
// otherwise the Date object containing the date/time the
// persistence service started
function getStartDate(store, options) {
  const testing = isTest(options)
  const storeDefined = store && typeof store == 'string' && store.length > 0
  const storeToUse = storeDefined ? store : config.persistence.default
  const instanceLabel = storeToUse + (testing ? "-test" : "-production")

  if (!startDates.has(instanceLabel)) getInstance(store, options)

  return startDates.get(instanceLabel)
}

module.exports = { getInstance, getStartDate }


// let myInstance = require(...)
// myInstance["hi"] = "there"

// let otherInstance = require...
// otherInstance["hi"] // should be "there"
