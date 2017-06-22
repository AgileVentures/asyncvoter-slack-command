// tests/unit/persistence/mongo.js
'use strict'

const config = require('config').get("persistence.mongo")
const mongo = require(process.cwd() + '/services/persistence/mongo')()

const chai = require('chai')
const should = chai.should()

// functions to check:
// - getName
// - setupVote
// - giveVote
// - getVotes
// - deleteAllData

describe('Mongo facade Unit tests', function () {

  describe('getName() checks', function () {
    const name = mongo.getName()
    it('Check the name is mongo://<host>:<port>/<database>', function () {
      const nameRegExp = /^mongo:\/\/\w[-\w]*:\d+\/[-\w]+$/
      nameRegExp.test(name).should.equal(true)
    })
  })

  describe('setupVote() checks', function () {})
  describe('giveVote() checks', function () {})
  describe('getVotes() checks', function () {})
  describe('deleteAllData() checks', function () {})


})
