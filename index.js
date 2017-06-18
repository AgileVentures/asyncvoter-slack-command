require('dotenv').config()

const express = require('express')
const bodyParser = require('body-parser')


const dbService = process.env.DB_SERVICE || 'redis'
const db = require('./services/persistence.js')(dbService)

const PORT = process.env.PORT || 4390

const app = express()

app.set('view engine', 'ejs');
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

require('./async-voter')(app, db)

const server = app.listen(PORT, () => {
  console.log('Listening on port ' + PORT)
})

module.exports = { app, server, db }
