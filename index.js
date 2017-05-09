require('dotenv').config()

const express = require('express')
const bodyParser = require('body-parser')
const winston = require('winston')
const redis = require('redis')
const db = redis.createClient(process.env.REDIS_URL || 'redis://localhost:6379')

db.on('error', function (err) {
  winston.error('Redis error: ' + err)
  console.log('Error ' + err)
})

db.on('ready', () => {
  winston.info("Redis connection ready")
})

db.on('connect', () => {
  winston.info("Redis connected")
})

db.on('reconnect', (message) => {
  winston.info("Redis reconnecting: " + message)
})

db.on('end', () => {
  winston.info("Redis connection closed")
})

db.on('warning', (warning) => {
  winston.warn("Redis warning received: " + warning)
})

const PORT = process.env.PORT || 4390

const app = express()

app.set('view engine', 'ejs');
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

require('./async-voter')(app, db)

const server = app.listen(PORT, () => {
  winston.info('Listening on port ' + PORT)
})

module.exports = { app, server, db }
