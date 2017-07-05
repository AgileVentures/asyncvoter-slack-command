// test/unit/persistence.js
'use strict'

// Factory for persistence layer modules
// Gives support for multiple persistence stores
// Persistence layer modules are facades to the actual persistence objects & functions
// A persistence object must contain: { getName, setupVote, giveVote, getVotes, deleteAllData }

const chai = require('chai')
const should = chai.should()


describe('Persistence factory Unit tests', function () {

  // Run tests on number of functions between the different environments
  ["test", "staging", "production"].forEach(function (environment) {

    // WARNING: process.env.NODE_ENV must be reset immediately afterwards!!!!
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = environment

    describe(`Mongo should be the default persistence store - ${environment} environment`,
      function () {
        const persistence = require(process.cwd() + '/services/persistence')()
        it('persistence.getName() starts with "mongo"', function () {
          const name = persistence.getName()
          name.startsWith('mongo').should.equal(true,
            `Expected the persistence layer to be mongo, but instead it is ${name}`)
        })
      })


    describe(`Checking availability of functions - ${environment} environment`, function () {

      const persistence = require(process.cwd() + '/services/persistence')('mongo')
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
