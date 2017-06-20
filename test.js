require('dotenv').config({ path: './.env.example' })

const index = require('./server')
const app = index.app
const server = index.server
const db = index.db

const chai = require('chai')
const should = chai.should()

const nock = require('nock')

chai.use(require('chai-http'))
chai.use(require('chai-string'))

const client_id = process.env.CLIENT_ID
const client_secret = process.env.CLIENT_SECRET
const code = 1;

const throwErr = err => {
  throw err;
}

describe('Landing page', function () {
  it('Display Slack button', function () {

    return chai.request(server)
      .get('/')
      .send()
      .then(res => {
        res.should.have.status(200)
        res.should.be.html
        res.text.should.have.string(client_id)
        return Promise.resolve(res)
      })
      .catch(err => {
        return Promise.reject(err)
      })

  })
})

describe('Install app', function () {
  it('Authorize the app', function () {

    // External requests are mocked
    nock('https://slack.com')
      .get('/api/oauth.access')
      .query({ code, client_id, client_secret })
      .reply(200)

    chai.request(app)
      .get('/oauth')
      .query({ code, client_id, client_secret })
      .send()
      .then(res => {
        res.should.redirect
      })
      .catch(throwErr)
  })
})


describe('Run a voting session', function () {

  before(
    function () {
      return db.flushdbAsync()
    })

  it('Start a voting session', function () {
    chai.request(app)
      .post('/commands')
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
      .catch(throwErr)
  })

  it('Record a vote', function () {
    return chai.request(app)
      .post('/actions')
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
        res.body.attachments[0].text.should.have.string('1 vote')
        res.body.attachments[0].text.should.have.string('User 1')
        res.body.attachments[0].actions[0].value.should.equals('Simple')
        res.body.attachments[0].actions[1].value.should.equals('Medium')
        res.body.attachments[0].actions[2].value.should.equals('Hard')
        res.body.attachments[0].actions[3].value.should.equals('No-opinion')
        res.body.attachments[0].actions[4].value.should.equals('reveal')
      })
      .catch(throwErr)
  })

  it('Reveal the results', () => {
    chai.request(app)
      .post('/actions')
      .send({
        payload: JSON.stringify({
          channel: { id: 1 },
          actions: [{ value: 'reveal' }],
          user: { name: 'User 1' },
          original_message: { text: 'Feature 1' }
        })
      })
      .then(res => {
        res.should.have.status(200)
        res.should.be.json
        res.body.text.should.have.string('Medium')
      })
      .catch(throwErr)
  })
})


describe('Run single-user multi-votes', function () {

  const voteLabel = '14_change_my_vote'
  const channelId = '14_test_channel'

  before(function () {
    // Clear the database and set up the voting session
    return db.flushdbAsync()
      .then(res => {
        return chai.request(app)
          .post('/commands')
          .send({ text: voteLabel, channel_id: channelId })
      })
      .then(res => {
        return Promise.resolve(res)
      })
  })

  // Makes a promise to the response text of a vote cast via HTTP
  function makeVote(username, actionValue) {

    return chai.request(app)
      .post('/actions')
      .send({
        payload: JSON.stringify({
          channel: { id: channelId },
          actions: [{ value: actionValue }],
          user: { name: username },
          original_message: { text: voteLabel }
        })
      })

  }


  it('Test double voting by user', function () {

    makeVote('Zsuark', 'Simple')
      .then(result => {
        result.body.text.should.contain(voteLabel)
        let responseText = result.body.attachments[0].text
        responseText.should.startWith('1 vote')
        responseText.should.have.entriesCount('Zsuark', 1)
        return makeVote('tansaku', 'Medium')
      })
      .then(result => {
        let responseText = result.body.attachments[0].text
        responseText.should.startWith('2 votes')
        responseText.should.have.entriesCount('Zsuark', 1)
        responseText.should.have.entriesCount('tansaku', 1)
        return makeVote('Zsuark', 'Medium')
      })
      .then(result => {
        let responseText = result.body.attachments[0].text
        responseText.should.startWith('2 votes')
        responseText.should.have.entriesCount('Zsuark', 1)
        responseText.should.have.entriesCount('tansaku', 1)
        return Promise.resolve(result)
      })
      .catch(err => {
        return Promise.reject(err)
      })
  })


  it('Confirm the results', function () {
    let request = chai.request(app)
      .post('/actions')
      .send({
        payload: JSON.stringify({
          channel: { id: channelId },
          actions: [{ value: 'reveal' }],
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
        return Promise.resolve(res)
      })
      .catch(err => {
        return Promise.reject(err)
      })

  })

})


describe('Persistence', function () {

  const channelId = "testChannel1"
  const voteLabel = "Test Vote"

  before(function () {
    db.flushdbAsync()
      .then(result => {
        return db.setupVote(channelId, voteLabel)
      })
      .then(result => {
        console.log("&&&&& setting up voting")
        return db.giveVote(channelId, "User 1", "Simple")
      })
      .then(result => {
        console.log("&&&&& completed added vote")
        return Promise.resolve(result)
      })
  })


  it('Record a vote to a restarted session', function () {

    return chai.request(app)
      .post('/actions')
      .send({
        payload: JSON.stringify({
          channel: { id: channelId },
          actions: [{ value: 'Medium' }],
          user: { name: 'User 2' },
          original_message: { text: voteLabel }
        })
      })
      .then(res => {
        res.should.have.status(200)
        res.should.be.json
        const responseText = res.body.attachments[0].text
        responseText.should.have.string('2 votes')
        responseText.should.have.string('User 1')
        responseText.should.have.string('User 2')
        return chai.request(app)
          .post('/actions')
          .send({
            payload: JSON.stringify({
              channel: { id: channelId },
              actions: [{ value: 'reveal' }],
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
        return Promise.resolve(res)
      })
      .catch(err => {
        return Promise.reject(err)
      })
  })

})
