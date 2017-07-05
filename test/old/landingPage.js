const config = require('config').get("slack-http")
const client_id = config.client_id
const client_secret = config.client_secret

const chai = require('chai')
const should = chai.should()

const cwd = process.cwd()
const persistence = require(cwd + '/services/persistence')()
const app = require(cwd + "/services/slack-http")(persistence)

const handleError = err => Promise.reject(err)

chai.use(require('chai-http'))

describe('Landing page', function () {
  it('Display Slack button', function () {

    return chai.request(app)
      .get('/')
      .send()
      .then(res => {
        res.should.have.status(200)
        res.should.be.html
        res.text.should.have.string(client_id)
        app.server.close()
        return Promise.resolve(res)
      })
      .catch(err => {
        return handleError(err)
      })

  })

})
