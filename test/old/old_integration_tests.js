const servicesDir = process.cwd() + "/services/"
const persistence = require(servicesDir + "persistence").getInstance(null, { env: "test" })
const app = require(servicesDir + "slack-http")(persistence)


const Promise = require("bluebird")

const chai = require('chai')
const should = chai.should()

const nock = require('nock')

chai.use(require('chai-http'))
chai.use(require('chai-string'))

const request = chai.request(app)

const code = 1;


const handleError = err => Promise.reject(err)


function makeVote(channelId, voteLabel, username, actionValue) {

  return request.post('/actions')
    .send({
      payload: JSON.stringify({
        channel: { id: channelId },
        actions: [{ value: actionValue }],
        user: { name: username },
        original_message: { text: voteLabel }
      })
    })
}


describe("Old tests to be reviewed/refactored", function () {

  before(
    function () {
      return persistence.deleteAllData()
    })

  describe('Run a voting session', function () {


    it('Start a voting session', function () {
      return request.post('/commands')
        .send({ text: 'Feature 1', channel_id: 1 })
        .then(res => {

          res.should.have.status(200)
          res.should.be.json
          res.should.have.property('text')

          const responseText = res.body.attachments[0].text
          responseText.should.be.a('string')
          responseText.should.equals('Please choose a difficulty')
          responseText.should.not.match(/dificult/i)

          const actions = res.body.attachments[0].actions
          actions[0].value.should.equals('Simple')
          actions[1].value.should.equals('Medium')
          actions[2].value.should.equals('Hard')
          actions[3].value.should.equals('No-opinion')
        })
    })

    it('Record a vote', function () {
      return request.post('/actions')
        .send({
          payload: JSON.stringify({
            channel: { id: 1 },
            actions: [{ value: 'Medium' }],
            user: { name: 'User 1' },
            original_message: { text: 'Feature 1' }
          })
        })
        .then(res => {

          res.should.have.status(200)
          res.should.be.json

          const attachment = res.body.attachments[0]

          attachment.text.should.have.string('1 vote')
          attachment.text.should.have.string('User 1')
          attachment.actions[0].value.should.equals('Simple')
          attachment.actions[1].value.should.equals('Medium')
          attachment.actions[2].value.should.equals('Hard')
          attachment.actions[3].value.should.equals('No-opinion')
          attachment.actions[4].value.should.equals('Reveal')
        })
    })

    it('Reveal the results', function () {
      return request.post('/actions')
        .send({
          payload: JSON.stringify({
            channel: { id: 1 },
            actions: [{ value: 'Reveal' }],
            user: { name: 'User 1' },
            original_message: { text: 'Feature 1' }
          })
        })
        .then(res => {
          res.should.have.status(200)
          res.should.be.json
          res.body.text.should.have.string('Medium')
        })
    })
  })


  describe('Run single-user multi-votes', function () {

    const voteLabel = '14_change_my_vote'
    const channelId = '14_test_channel'
    const castVote = makeVote.bind(makeVote, channelId, voteLabel)

    before(function () {
      return request.post('/commands')
        .send({ text: voteLabel, channel_id: channelId })
    })


    it('Test double voting by user', function () {
      return castVote('Zsuark', 'Simple')
        .then(result => {
          let responseText = result.body.attachments[0].text
          responseText.should.startWith('1 vote so far [ @Zsuark ]')
          result.body.text.should.contain(voteLabel)
          responseText.should.have.entriesCount('Zsuark', 1)
          return castVote('tansaku', 'Medium')
        })
        .then(result => {
          let responseText = result.body.attachments[0].text
          responseText.should.startWith('2 votes')
          responseText.should.have.entriesCount('Zsuark', 1)
          responseText.should.have.entriesCount('tansaku', 1)
          return castVote('Zsuark', 'Medium')
        })
        .then(result => {
          let responseText = result.body.attachments[0].text
          responseText.should.startWith('2 votes')
          responseText.should.have.entriesCount('Zsuark', 1)
          responseText.should.have.entriesCount('tansaku', 1)
        })
    })


    it('Confirm the results', function () {

      return request.post('/actions')
        .send({
          payload: JSON.stringify({
            channel: { id: channelId },
            actions: [{ value: 'Reveal' }],
            user: { name: 'Zsuark' },
            original_message: { "text": voteLabel }
          })
        })
        .then(res => {
          res.should.have.status(200)
          res.should.be.json
          const responseText = res.body.text
          responseText.should.have.string('tansaku Medium')
          responseText.should.have.string('Zsuark Medium')
          responseText.should.have.entriesCount('tansaku', 1)
          responseText.should.have.entriesCount('Zsuark', 1)
        })

    })

  })


  describe('Persistence', function () {

    const channelId = "testChannel1"
    const voteLabel = "Test Vote"
    const castVote = makeVote.bind(makeVote, channelId, voteLabel)

    it('Record a vote to a restarted session', function () {

      return castVote("User 1", "Simple")
        .then(res => {
          res.should.have.status(200)
          res.should.be.json
          const responseText = res.body.attachments[0].text
          responseText.should.equal("1 vote so far [ @User 1 ]")
          return castVote("User 2", "Medium")
        })
        .then(res => {
          const responseText = res.body.attachments[0].text
          responseText.should.have.string('2 votes ')

          responseText.should.have.string('User 1')
          responseText.should.have.string('User 2')
          return request.post('/actions')
            .send({
              payload: JSON.stringify({
                channel: { id: channelId },
                actions: [{ value: 'Reveal' }],
                user: { name: 'User 1' },
                original_message: { text: voteLabel }
              })
            })
        })
        .then(res => {
          res.should.have.status(200)
          res.should.be.json
          const responseText = res.body.text
          responseText.should.have.string('User 1 Simple')
          responseText.should.have.string('User 2 Medium')
        })
    })

  })
})

// ////////////////////////////////////////////////////////////// //


const config = require('config').get("slack-http")
const client_id = config.client_id
const client_secret = config.client_secret


describe('Install app', function () {
  it('Authorize the app', function () {

    // External requests are mocked
    nock('https://slack.com')
      .get('/api/oauth.access')
      .query({ code, client_id, client_secret })
      .reply(200)

    return request.get('/oauth')
      .query({ code, client_id, client_secret })
      .send()
      .then(res => {
        res.should.redirect
        app.server.close()
      })
      .catch(handleError)
  })
})

describe('Landing page', function () {
  it('Display Slack button', function () {

    return request.get('/')
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
