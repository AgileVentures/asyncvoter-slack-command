// redis-persistence.js
'use strict'

require('dotenv').config()


const db = (require('redis'))
  .createClient(process.env.REDIS_URL || 'redis://localhost:6379')

db.on('error', function (err) {
  console.log('Error ' + err)
})

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

module.exports = { del, set, flushdb, get }
