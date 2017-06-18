// services/persistence/mongo.js
'use strict'

require('dotenv').config()

const mongoUrl = process.env.MONGO_URL || 'localhost'
const mongoDb = process.env.MONGO_DB || 'asyncvoter'

const mongoFullUrl = mongoUrl + (mongoUrl.endsWith('/') ? '' : '/') + mongoDb

const db = require('monk')(mongoFullUrl).then(() => {
  console.log('Connected correctly to Mongo server')
})

const channelVotes = db.get('channel_votes')


const del = (channel_id, handler) => {
  // not sure if we actually need to "properly" handle this for Mongo
  return handler()
}

const set = (channel_id, votes, handler) => {
  return channelVotes.insert({ channel_id: channel_id, votes: votes }).then((docs) => {
    // error?
    handler()
  })
}


const get = (channel_id, done) => {


  return channelVotes.findOne({ channel_id: channel_id }, { sort: { $natural: -1 } }).then((doc) => {
    return done(null, doc.votes)
  })
}

const flushdb = (done) => {
  // TODO: Not sure if needed
  // ... but what about test data ... ? - maybe better to do that manually
  return done()
}

module.exports = { del, set, flushdb, get }
