// services/persistence/redis.js
'use strict'

const config = require('config').get("persistence.redis")
const redisUrl = "redis://" + config.host + ':' + config.port


const Promise = require("bluebird")


const redisSynchronous = require('redis').createClient(redisUrl)
const redis = Promise.promisifyAll(redisSynchronous)


redisSynchronous.on('connect', function () {
  console.log("Connected to redis on " + config.host + ":" + config.port)
})

redisSynchronous.on('ready', function () {
  console.log("Redis ready!")
})

redisSynchronous.on('error', function (err) {
  console.log("Redis connection error:", err)
})



module.exports = function (options) {
  // Return type - promise
  // Returns a string indicating success on promise fulfillment 
  const setupVote = (channel_id, label) => {
    // TODO: Do we need to check if the last
    // vote is finished yet?

    return redis.setAsync("current_vote::" + channel_id, label)
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
    return redis.getAsync("current_vote::" + channel_id)
  }

  // Return type - promise
  // Returns a string indicating success on promise fulfillment 
  const giveVote = (channel_id, user, voteString) => {
    return getCurrentVotingSession(channel_id)
      .then(voteLabel => {
        return redis.hsetAsync("votes::" + channel_id + voteLabel, user, voteString)
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
        return redis.hgetallAsync("votes::" + channel_id + voteLabel)
      })
  }


  const deleteAllData = () => {
    return redis.flushdbAsync()
  }

  return { setupVote, giveVote, getVotes, deleteAllData }
}
