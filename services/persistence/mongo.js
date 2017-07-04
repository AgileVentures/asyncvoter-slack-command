// services/persistence/mongo.js
'use strict'

const Promise = require("bluebird")

const config = require('config').get("persistence.mongo")
const mongoUrl = config.host + ':' + config.port + '/' + config.database

const name = "mongo://" + config.host + ":" + config.port + '/' + config.database

const mongo = require('monk')(mongoUrl)

// These two collections represent a voting session activity
const votingSessions = mongo.get('voting_sessions')
const votes = mongo.get('votes')

// votingSession - { channel, description }  // TODO: Include user ?!
// votes - each vote is stored as { sessionDescription, user, action }

// Where action could be described as the vote itself, an abstain or a reveal
// A reveal currently ends the voting session
// { channel, description, user, vote }



module.exports = () => {

  function getName() {
    return name
  }

  // TODO: Should we raise an error if a voting session has already happened?
  function setupVote(channelId, description) {
    return votingSessions.insert({ channel_id: channelId, description: description })
  }

  // `persistence.giveVote(channelId, voteDescription, user, vote)`
  function giveVote(channelId, description, user, vote) {
    return votes.insert({ channel_id: channelId, description: description, user: user, vote: vote })
  }


  function getVotes(channelId, description) {
    return votes.find({ channel_id: channelId, description: description }, { sort: { $natural: 1 } })
      .then(votes => {
        let voteObject = votes.reduce((acc, item) => {
          acc["votes"][item.user.name] = item.vote
          return acc
        }, { channel_id: channelId, description: description, votes: {} })
        return Promise.resolve(voteObject)
      })
  }


  // WARNING: DELETES EVERYTHING!!!
  function deleteAllData() {
    return votingSessions.remove({})
      .then(results => {
        return votes.remove({})
      })
  }

  return { setupVote, giveVote, getVotes, deleteAllData, getName }
}
