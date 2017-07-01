// tests/unit/persistence/mongo.js
'use strict'

const config = require('config').get("persistence.mongo")
const persistence = require(process.cwd() + '/services/persistence/mongo')()

const chai = require('chai')
const should = chai.should()

const mongoUrl = config.host + ':' + config.port + '/' + config.database
const ourMongoName = "mongo://" + mongoUrl
  // WARNING: If you put password info in the mongoUrl, modify
  // ourMongoName so that it omits it. ourMongoName will be displayed
  // in the test.
  // Please do not display passwords
const mongo = require('monk')(mongoUrl)

const votingSessions = mongo.get('voting_sessions')
const votes = mongo.get('votes')

const Promise = require('bluebird')

const channelId = "The Channel ID"
const description = "The vote description"

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
            results.forEach(result => result.length.should.equal(0,
              "Single result test"))
          })
      })

    }) // deleteAllData() checks


  describe('getName() checks', function () {
      const name = persistence.getName()
      it('Check the name matches mongo://<host>:<port>/<database> ' +
        'and "test" is in the database name',
        function () {
          const nameRegExp = /^mongo:\/\/\w[-\w]*:\d+\/[-\w]*test[-\w]*$/
          nameRegExp.test(name).should.equal(true)
        })
      const ourName = "mongo://" + mongoUrl
      it('Check the name is ' + ourName, function () {
        persistence.getName().should.equal(ourName)
      })
    }) // getName() checks


  describe('setupVote() checks', function () {
      // Mongo stores voting sessions in the voting_sessions collection

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

  // `persistence.giveVote(channelId, voteDescription, user, vote)`
  describe('giveVote() checks', function () {
    beforeEach(function () {
      return persistence.deleteAllData()
        .then(() => persistence.setupVote(channelId, description))
    })

    it('casting a single vote', function () {
      const user = { name: "Andrew Developer" }
      const vote = "Medium"
      return persistence.giveVote(channelId, description, user, vote)
        .then(() => votes.find({ description: description }))
        .then(votes => {
          votes.length.should.equal(1)
          votes[0].user.name.should.equal(user.name, "User error")
          votes[0].vote.should.equal(vote, "Vote error")
        })
    })

    it.skip('casting multiple votes')
  })

  describe.skip('getVotes() checks', function () {
    describe.skip('Results are in expected format')
    describe.skip('Voting in multiple votes on the same channel')
  })


})
