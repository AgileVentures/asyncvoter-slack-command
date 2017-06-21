if (!process.env.NODE_ENV) process.env.NODE_ENV = "production"


const db = require('./services/persistence.js')(dbService)
const app = require('./services/slack-http')(db)
