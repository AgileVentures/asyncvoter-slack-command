// services/persistence/mongo.js
'use strict'

const Promise = require("bluebird")

const config = require('config').get("persistence.mongo")
const mongoUrl = config.host + ':' + config.port + '/' + config.database

const mongo = require('monk')(mongoUrl)

// mongo.then(result => {
//   console.log('Connected correctly to Mongo server:', result)
//   return Promise.resolve(result)
// })

const votingSessions = mongo.get('voting_sessions')
const votes = mongo.get('votes')

module.exports = (options) => {

  // TODO: Should we raise an error if a voting session has already happened?
  function setupVote(channelId, label) {
    return votingSessions.insert({ channel_id: channelId, vote_label: label })
  }

  function getCurrentVotingSession(channelId) {
    return votingSessions
      .findOne({ channel_id: channelId }, { fields: { vote_label: 1 } }, { sort: { $natural: -1 } })
      .then(doc => {
        if (!doc) {
          return Promise.reject(new Error("Unable to find voting session, channelId: " + channelId));
        } else return Promise.resolve(doc.vote_label)
      })
  }


  function giveVote(channelId, user, vote) {
    return getCurrentVotingSession(channelId)
      .then(voteLabel => {
        return votes.insert({ channel_id: channelId, vote_label: voteLabel, user: user, vote: vote })
      })
  }


  function getVotes(channelId) {
    return getCurrentVotingSession(channelId)
      .then(voteLabel => {
        return votes.find({ channel_id: channelId, vote_label: voteLabel }, { fields: { user: 1, vote: 1 } }, { sort: { $natural: -1 } })
      })
      .then(votes => {
        var voteObject = votes.reduce((acc, item) => {
          acc[item.user] = item.vote
          return acc
        }, {})
        return Promise.resolve(voteObject)
      })
  }


  // WARNING: DELETES EVERYTHING!!!
  function deleteAllData() {
    return votingSessions.remove({})
      .then(results => {
        return votes.remove({})
      })
      .then(results => Promise.resolve(results))
  }

  return { setupVote, giveVote, getVotes, deleteAllData }
}
