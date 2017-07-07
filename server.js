// This file is just intended to start the server
// This file should not export anything

// NODE_ENV environment variable should be present (important!)
// So we set it here if it is missing.
// DEFAULT: production
// (TODO: Should it be staging?)
if (!process.env.NODE_ENV) process.env.NODE_ENV = "production"


// if (require.main === module) {
//   console.log('called directly');
// } else {
//   console.log('required as a module');
// }

const persistence =
  require('./services/persistence')
  .getInstance('mongo', { env: process.env.NODE_ENV })
const slackWebService = require('./services/slack-http')(persistence)
