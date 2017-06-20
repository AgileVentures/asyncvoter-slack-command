require('dotenv').config()


const dbService = process.env.DB_SERVICE || 'redis'

const db = require('./services/persistence.js')(dbService)
const app = require('./services/slack-http')(db)



module.exports = { app, db }
