// test/unit/persistence.js
'use strict'

// Factory for persistence layer modules
// Gives support for multiple persistence stores
// Persistence layer modules are facades to the actual persistence objects & functions
// A persistence object must contain: { getName, setupVote, giveVote, getVotes, deleteAllData }

const chai = require('chai')
const should = chai.should()
const persistenceStore = require(`${process.cwd()}/services/persistence`)

const Promise = require('bluebird')


describe('Persistence factory Unit tests', function () {

  const params = ["mongo", { env: "test" }]


  describe('Using singleton persistence', function () {

    it("persistence should expose two functions: " +
      "{getInstance, getStartDate}",
      function () {
        const type = typeof persistenceStore
        type.should.equal("object")
        const getPersistenceType = typeof persistenceStore.getInstance
        getPersistenceType.should.equal("function")
        const getStartDateType = typeof persistenceStore.getStartDate
        getStartDateType.should.equal("function")
      }
    )

    it("getting a second instance gives the same as the first",
      function () {

        const firstInstance = persistenceStore.getInstance(...params)

        return new Promise(result => setTimeout(result, "1000"))
          .then(() => {
            const secondPersistence =
              require(`${process.cwd()}/services/persistence`)
            const secondInstance = secondPersistence.getInstance(...params)

            const firstStartTime = persistenceStore.getStartDate(...params)
            const secondStartTime = secondPersistence.getStartDate(...params)

            firstStartTime.should.equal(secondStartTime)
          })

      }
    )


  })

  // Run tests on number of functions between the different environments
  const environments = ["test", "staging", "production"]
  environments.forEach(function (environment) {

    // WARNING: process.env.NODE_ENV must be reset immediately afterwards!!!!
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = environment

    describe(`Mongo should be the default persistence store - ${environment} environment`,
      function () {
        const persistence = persistenceStore.getInstance(null, { env: environment })
        it('persistence.getName() starts with "mongo"', function () {
          const name = persistence.getName()
          name.startsWith('mongo').should.equal(true,
            `Expected the persistence layer to be mongo, but instead it is ${name}`)
        })
      })


    describe(`Checking availability of functions - ${environment} environment`, function () {

      const persistence = persistenceStore.getInstance(null, { env: environment })
      const actualFunctions = Object.keys(persistence)
      const expectedFunctions =
        environment === 'test' ? ['getName', 'setupVote', 'giveVote', 'getVotes', 'deleteAllData'] : ['getName', 'setupVote', 'giveVote', 'getVotes']

      it(`persistence object has ${expectedFunctions.length} keys`, function () {
        actualFunctions.length.should.equal(expectedFunctions.length,
          `${actualFunctions.length} functions found on persistence object.` +
          ` ${expectedFunctions.length} functions were expected.` +
          ` Object members found: ${actualFunctions.join(", ")}`)
      })

      expectedFunctions.forEach(function (expected) {
        it(`${expected} is a function`, function () {

          actualFunctions.includes(expected).should.equal(true,
            `${expected} not found on persistence object`)

          const functionType = typeof persistence[expected]
          functionType.should.equal('function',
            `${expected} is not a function type on persistence object`)
        })
      })

      // end: describe Checking availability of functions
    })

    // IMPORTANT: DO NOT REMOVE THIS LINE!!!!!
    process.env.NODE_ENV = originalEnv

    // end: forEach environment
  })

  // end: describe Persistence factory
})
