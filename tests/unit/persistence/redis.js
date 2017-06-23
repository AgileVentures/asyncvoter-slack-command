// tests/unit/persistence/redis.js
'use strict'

const config = require('config').get("persistence.redis")
const redis = require(process.cwd() + '/services/persistence/redis')()

const chai = require('chai')
const should = chai.should()

// functions to check:
// - getName
// - setupVote
// - giveVote
// - getVotes
// - deleteAllData

describe('Redis facade Unit tests', function () {

  describe('getName() checks', function () {
    const name = redis.getName()
      // This was true for Mongo
      // Maybe not here
    it('Check the name is redis://<host>:<port>', function () {
      const nameRegExp = /^redis:\/\/\w[-\w]*:\d+\/[-\w]+$/
      nameRegExp.test(name).should.equal(true)
    })
  })

  describe('setupVote() checks', function () {})
  describe('giveVote() checks', function () {})
  describe('getVotes() checks', function () {})
  describe('deleteAllData() checks', function () {})


})
