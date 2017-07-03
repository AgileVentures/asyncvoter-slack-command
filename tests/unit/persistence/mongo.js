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
      // const user = { name: "Andrew Developer" }
      const user = "Andrew Developer"
      const vote = "Medium"
      return persistence.giveVote(channelId, description, user, vote)
        .then(() => votes.find({ description: description }))
        .then(votes => {
          votes.length.should.equal(1)
          votes[0].user.should.equal(user, "User error")
          votes[0].vote.should.equal(vote, "Vote error")
        })
    })

    it('casting multiple votes', function () {
      const user1 = "Developer A"
      const user2 = "Developer B"
      const user3 = "Developer C"
      const user4 = "Developer D"
      const [simple, medium, hard] = ["Simple", "Medium", "Hard"]

      return Promise.all([
        persistence.giveVote(channelId, description, user1, simple),
        persistence.giveVote(channelId, description, user2, hard),
        persistence.giveVote(channelId, description, user3, medium),
        persistence.giveVote(channelId, description, user4, medium)
      ]).then(results => {
        results.length.should.equal(4)
        return Promise.all([
          persistence.giveVote(channelId, description, user1, medium),
          persistence.giveVote(channelId, description, user2, medium)
        ])
      }).then(results => {
        results.length.should.equal(2)
        return votes.find({ channel_id: channelId, description: description }, { sort: { $natural: 1 } })
      }).then(votes => {
        // console.log("votes:", JSON.stringify(votes))
        // console.log("votes.length:", JSON.stringify(votes.length))
        votes.length.should.equal(6)



        const voteUsers = votes.reduce((acc, val) => {
          // console.log('val:', JSON.stringify(val))

          const userName = val.user
          if (acc.hasOwnProperty(userName)) {
            acc[userName] = [...acc[userName], val.vote]
          } else {
            acc[userName] = [val.vote]
          }

          return acc
        }, {})

        voteUsers[user1].length.should.equal(2)
        voteUsers[user1][0].should.equal(simple)
        voteUsers[user1][1].should.equal(medium)
        voteUsers[user2].length.should.equal(2)
        voteUsers[user2][0].should.equal(hard)
        voteUsers[user2][1].should.equal(medium)
        voteUsers[user3].length.should.equal(1)
        voteUsers[user3][0].should.equal(medium)
        voteUsers[user4].length.should.equal(1)
        voteUsers[user4][0].should.equal(medium)

      })

    })
  })

  describe('getVotes() checks', function () {

    const user1 = "Developer A"
    const user2 = "Developer B"
    const user3 = "Developer C"
    const user4 = "Developer D"
    const [simple, medium, hard] = ["Simple", "Medium", "Hard"]
    const description = "first vote description"
    const description2 = "other vote description"


    beforeEach(function () {

      return persistence.deleteAllData()
        // .then(() => persistence.setupVote(channelId, description))
        .then(function () {
          // console.log("description:", description)
          return persistence.setupVote(channelId, description)
        }).then(function (result) {
          // console.log("------ result:", result)
          // console.log("description:", description)
          // console.log("description2:", description2)
          // return persistence.setupVote(channelId, description2)
          return persistence.giveVote(channelId, description, user1, simple)
            // return persistence.giveVote(channelId, "description", user1, simple)
            // return persistence.giveVote(channelId, result.description, user1.name, simple)
        })
        // .then(function () {
        //   return persistence.giveVote(channelId, description, user1, simple)
        // })
        // .then(() => persistence.giveVote(channelId, description, user1, simple))
        // .then(() => Promise.all([
        //   persistence.giveVote(channelId, description, user1, simple),
        //   persistence.giveVote(channelId, description, user2, hard),
        //   persistence.giveVote(channelId, description, user3, medium),
        //   persistence.giveVote(channelId, description, user4, medium),
        // ]))
        // .then(() => persistence.setupVote(channelId, description2))
        // .then(() => Promise.all([
        //   persistence.giveVote(channelId, description2, user1, hard),
        //   persistence.giveVote(channelId, description2, user2, hard),
        //   persistence.giveVote(channelId, description2, user3, hard),
        // ]))
        // .then(() => Promise.all([
        //   persistence.giveVote(channelId, description, user1, medium),
        //   persistence.giveVote(channelId, description, user2, medium)
        // ]))
    })


    it('Results are in expected format', function () {
      console.log()
      console.log("channelId:", channelId)
      console.log("description:", description)
        // return votes.find({ channel_id: channelId, description: description })
      return votes.find({ channel_id: channelId })
        .then(results => {
          // console.log("~±~±~±~±~±~±~±~± Found votes: " + results)
          console.log("~±~±~±~±~±~±~±~± Found votes: " + JSON.stringify(results))
            //votes.length.should.not.equal(0)
        })
        // return persistence.getVotes(channelId, description)
        //   .then(result => {
        //     console.log("result:", JSON.stringify(result))
        //result.length.should.equal(1)
    })


    describe.skip('Voting in multiple votes on the same channel', function () {

    })

  })


})
