// services/persistence/redis.js
'use strict'

require('dotenv').config()

const Promise = require("bluebird")

const dbNoPromises = require('redis')
  .createClient(process.env.REDIS_URL || 'redis://localhost:6379')

dbNoPromises.on('error', function (err) {
  console.error('Error: ' + err)
})

const db = Promise.promisifyAll(dbNoPromises)



// Return type - promise
// Returns a string indicating success on promise fulfillment 
const setupVote = (channel_id, label) => {
  // TODO: Do we need to check if the last
  // vote is finished yet?
  return db.setAsync("current_vote::" + channel_id, label)
    .then(response => {
      return new Promise((resolve, reject) => {
        const message = "CHANNEL: '" + channel_id +
          "', NEW VOTING SESSION: '" + label + "'";
        resolve(message)
      })
    })
}

// Return type - promise
// Helper to get current voting session label
function getCurrentVotingSession(channel_id) {
  return db.getAsync("current_vote::" + channel_id)
}

// Return type - promise
// Returns a string indicating success on promise fulfillment 
const giveVote = (channel_id, user, voteString) => {
  return getCurrentVotingSession(channel_id)
    .then(voteLabel => {
      return db.hsetAsync("votes::" + channel_id + voteLabel, user, voteString)
    })
    .then(results => {
      return ("Vote cast on " + channel_id +
        ". Details: " + JSON.stringify(results))
    })
}

// Return type - promise
// Upon fulfillment gives an object containing user => vote mappings
const getVotes = (channel_id) => {
  return getCurrentVotingSession(channel_id)
    .then(voteLabel => {
      return db.hgetallAsync("votes::" + channel_id + voteLabel)
    })
}


const flushdbAsync = () => {
  return db.flushdbAsync()
}



// module.exports = { del, set, flushdb, get, db }
module.exports = { setupVote, giveVote, getVotes, flushdbAsync }
