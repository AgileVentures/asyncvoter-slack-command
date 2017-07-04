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
// - `getName()`
// - start a vote:   `setupVote(channelId, voteDescription)`
// - record a vote:  `giveVote(channelId, voteDescription, user, vote)`
// - reveal outcome: `getVotes(channelId, voteDescription)`
// - `deleteAllData()`


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

      it('casting multiple votes', function () {
        const user1 = { name: "Developer A" }
        const user2 = { name: "Developer B" }
        const user3 = { name: "Developer C" }
        const user4 = { name: "Developer D" }
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
          votes.length.should.equal(6)

          const voteUsers = votes.reduce((acc, val) => {
            const userName = val.user.name
            if (acc.hasOwnProperty(userName)) {
              acc[userName] = [...acc[userName], val.vote]
            } else {
              acc[userName] = [val.vote]
            }
            return acc
          }, {})

          voteUsers[user1.name].length.should.equal(2)
          voteUsers[user1.name][0].should.equal(simple)
          voteUsers[user1.name][1].should.equal(medium)
          voteUsers[user2.name].length.should.equal(2)
          voteUsers[user2.name][0].should.equal(hard)
          voteUsers[user2.name][1].should.equal(medium)
          voteUsers[user3.name].length.should.equal(1)
          voteUsers[user3.name][0].should.equal(medium)
          voteUsers[user4.name].length.should.equal(1)
          voteUsers[user4.name][0].should.equal(medium)

        })

      })
    }) // giveVote(...) checks



  describe('getVotes() checks', function () {

      const user1 = { name: "Developer A" }
      const user2 = { name: "Developer B" }
      const user3 = { name: "Developer C" }
      const user4 = { name: "Developer D" }
      const [simple, medium, hard] = ["Simple", "Medium", "Hard"]
      const description = "first vote description"
      const description2 = "other vote description"


      beforeEach(function () {

        // At the end of this function, there will be:
        //   - 6 votes in total for description - (user1, user2, user3, user4)
        //   - 4 effective votes in total for description - all "Medium"
        //   - 5 votes in total for description2 - (user1, user2, user3)
        //   - 3 effective votes for description2 - all "Hard"

        return persistence.deleteAllData()
          .then(() => persistence.setupVote(channelId, description))
          .then(() => Promise.all(
            [
              persistence.giveVote(channelId, description, user1, simple),
              persistence.giveVote(channelId, description, user2, hard),
              persistence.giveVote(channelId, description, user3, medium),
              persistence.giveVote(channelId, description, user4, medium),
              persistence.giveVote(channelId, description2, user1, medium),
              persistence.giveVote(channelId, description2, user3, medium),
            ]
          ))
          .then(() => persistence.setupVote(channelId, description2))
          .then(() => Promise.all(
            [
              persistence.giveVote(channelId, description2, user1, hard),
              persistence.giveVote(channelId, description2, user2, hard),
              persistence.giveVote(channelId, description2, user3, hard),
            ]
          ))
          .then(() => Promise.all(
            [
              persistence.giveVote(channelId, description, user1, medium),
              persistence.giveVote(channelId, description, user2, medium)
            ]
          ))
      })



      it('Results are as per expected', function () {

        return persistence.getVotes(channelId, description)
          .then(results => {

            let usernames = [user1.name, user2.name, user3.name, user4.name]

            results.channel_id.should.equal(channelId)
            results.description.should.equal(description)
            const voteKeys = Object.keys(results.votes) // usernames of votes cast
            voteKeys.length.should.equal(4,
              `4 votes expected - ${voteKeys.length} votes found`)

            // Check that every expected username has a vote assigned to it
            usernames.forEach(username => voteKeys.includes(username)
              .should.equal(true, `Username "${username}" is missing from results!`))

            // Check every vote is medium, as per expected
            voteKeys.forEach(user => results.votes[user].should.equal(medium,
              `Vote "${description}", ${user} has voted "${medium}"` +
              ` not "${results.votes[user]}" as reported`))
          })
      })


      it('Voting in multiple votes on the same channel', function () {
        return persistence.getVotes(channelId, description2)
          .then(results => {
            let usernames = [user1.name, user2.name, user3.name]

            results.channel_id.should.equal(channelId)
            results.description.should.equal(description2)
            const voteKeys = Object.keys(results.votes) // usernames of votes cast
            voteKeys.length.should.equal(3,
              `3 votes expected - ${voteKeys.length} votes found`)

            // Check that every expected username has a vote assigned to it
            usernames.forEach(username => voteKeys.includes(username)
              .should.equal(true, `Username "${username}" is missing from results!`))

            // Check every vote is hard, as per expected
            voteKeys.forEach(user => results.votes[user].should.equal(hard,
              `Vote "${description2}", ${user} has voted "${hard}"` +
              ` not "${results.votes[user]}" as reported`))

            return persistence.getVotes(channelId, description)
          })
          .then(results => {
            const voteKeys = Object.keys(results.votes)
            voteKeys.length.should.equal(4,
              `4 votes expected - ${voteKeys.length} votes found`)

          })
      })

    }) // getVotes(...) checks

})
