// const config = require('config').get("slack-http")
// const client_id = config.client_id
// const client_secret = config.client_secret

// const chai = require('chai')
// const should = chai.should()

// const cwd = process.cwd()
// const persistence = require(cwd + '/services/persistence')('redis')
// const app = require(cwd + "/services/slack-http")(persistence)

// const code = Math.floor((Math.random() * 10000) + 1)
// const nock = require('nock')

// const handleError = err => Promise.reject(err)

// describe('Install app', function () {
//   it('Authorize the app', function () {

//     // External requests are mocked
//     nock('https://slack.com')
//       .get('/api/oauth.access')
//       .query({ code, client_id, client_secret })
//       .reply(200)

//     chai.request(app)
//       .get('/oauth')
//       .query({ code, client_id, client_secret })
//       .send()
//       .then(res => {
//         res.should.redirect
//         app.server.close()
//       })
//       .catch(handleError)
//   })

//   app.server.close()
// })
