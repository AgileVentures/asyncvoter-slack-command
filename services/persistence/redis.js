// services/persistence/redis.js
'use strict'

require('dotenv').config()

const Promise = require("bluebird")

const dbNoPromises = require('redis')
  .createClient(process.env.REDIS_URL || 'redis://localhost:6379')

dbNoPromises.on('error', function (err) {
  console.log('Error ' + err)
})

const db = Promise.promisifyAll(dbNoPromises)




// const setupVote = (channel_id, label) => {
// 	db.get
// }


// TODO: should I be lift'ing here instead?

const del = (channel_id, handler) => {
  return db.del(channel_id, handler)
}

const set = (channel_id, value, handler) => {
  return db.set(channel_id, value, handler)
}


const get = (channel_id, done) => {
  return db.get(channel_id, done)
}

const flushdb = (done) => {
  return db.flushdb(done)
}



module.exports = { del, set, flushdb, get, db }
  // module.exports = { setupVote, vote, getVotes, flushdb }
