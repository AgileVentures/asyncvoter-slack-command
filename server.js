// This file is just intended to start the server
// This file should not export anything

// NODE_ENV environment variable should be present (important!)
// So we set it here if it is missing.
// DEFAULT: production
// (TODO: Should it be staging?)
if (!process.env.NODE_ENV) process.env.NODE_ENV = "production"

const db = require('./services/persistence')('mongo')
const slackWebService = require('./services/slack-http')(db)
