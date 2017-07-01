// tests/unit/persistence/mongo.js
'use strict'

const config = require('config').get("persistence.mongo")
const persistence = require(process.cwd() + '/services/persistence/mongo')()

const chai = require('chai')
const should = chai.should()

const mongoUrl = config.host + ':' + config.port + '/' + config.database
const mongo = require('monk')(mongoUrl)

const votingSessions = mongo.get('voting_sessions')
const votes = mongo.get('votes')

const Promise = require('bluebird')

// functions to check:
// - getName
// - setupVote
// - giveVote
// - getVotes
// - deleteAllData

// - start a vote:   `persistence.setupVote(channelId, voteDescription)`
// - record a vote:  `persistence.giveVote(channelId, voteDescription, user, vote)`
// - reveal outcome: `persistence.getVotes(channelId, voteDescription)`


describe('Mongo facade Unit tests', function () {


  describe('deleteAllData() checks', function () {
      before(() => {
        return Promise.all([
            votingSessions.drop(),
            votes.drop()
          ])
          .then(() => Promise.all([
            votingSessions.insert([{ this: "that" }, { what: "ever" }]),
            votes.insert([{ foo: "bar" }, { ho: "hum" }])
          ]))
      })

      it('Database has items', function () {
        return Promise.all([
          votingSessions.find(),
          votes.find()
        ]).then(results => {
          results.length.should.equal(2, "Results array test")
          results.forEach(result => result.length.should.equal(2, "Single result test"))
        })
      })

      it('persistence.deleteAllData() clears the database', function () {
        return persistence.deleteAllData()
          .then(() => {
            return Promise.all([
              votingSessions.find(),
              votes.find()
            ])
          })
          .then((results) => {
            results.length.should.equal(2, "Results array test")
            results.forEach(result => result.length.should.equal(0, "Single result test"))
          })
      })

    }) // deleteAllData() checks


  describe.skip('getName() checks', function () {
      const name = persistence.getName()
      it('Check the name is mongo://<host>:<port>/<database>', function () {
        const nameRegExp = /^mongo:\/\/\w[-\w]*:\d+\/[-\w]*test[-\w]*$/
        nameRegExp.test(name).should.equal(true)
      })
      const ourName = "mongo://" + mongoUrl
      it('Check the name is ' + ourName, function () {})
    }) // getName() checks


  describe.skip('setupVote() checks', function () {
      // Mongo stores voting sessions in the voting_sessions collection
      const channelId = "The Channel ID"
      const description = "The vote description"

      before(function () {
        return persistence.deleteAllData()
          .then(() => {
            return persistence.setupVote(channelId, description)
          })
      })

      it('Stored vote should appear in database', function () {
        return votingSessions.find({
          description: description
        }).then(docs => {
          docs.length.should.equal(1)
          const session = docs[0]
          session.channel_id.should.equal(channelId)
          session.description.should.equal(description)
        })
      })
    }) // setupVote() checks

  describe.skip('giveVote() checks', function () {})

  describe.skip('getVotes() checks', function () {})


})
