require('dotenv').config({ path: './.env.example' })

const index = require('./index')
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

// All of these 
// Note - arrow functions should not be used with mocha
// 
describe('Landing page', function () {
  it('Display Slack button', function (done) {

    // TODO: Promise!
    chai.request(server)
      .get('/')
      .end((err, res) => {

        // TODO: Was missing - there should be no error
        should.not.exist(err)

        res.should.have.status(200)
        res.should.be.html
        res.text.should.have.string(client_id)

        done()
      })
  })
})

describe('Install app', function () {
  it('Authorize the app', function (done) {

    // Given: External requests are mocked
    nock('https://slack.com')
      .get('/api/oauth.access')
      .query({ code, client_id, client_secret })
      .reply(200)

    // TODO: Promise!
    chai.request(app)
      .get('/oauth')
      .query({ code, client_id, client_secret })
      .end((err, res) => {
        res.should.redirect

        done()
      })
  })
})

describe('Run a voting session', function () {

  before(function (done) {
    db.flushdb(done);
  })

  it('Start a voting session', function (done) {
    chai.request(app)
      .post('/commands')
      .send({ text: 'Feature 1', channel_id: 1 })
      .end((err, res) => {
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
        done()
      })
  })

  it('Record a vote', function (done) {
    chai.request(app)
      .post('/actions')
      .send({
        payload: JSON.stringify({
          channel: { id: 1 },
          actions: [{ value: 'Medium' }],
          user: { name: 'User 1' },
          original_message: { text: 'Feature 1' }
        })
      })
      .end((err, res) => {
        res.should.have.status(200)
        res.should.be.json
        res.body.attachments[0].text.should.have.string('1 vote')
        res.body.attachments[0].text.should.have.string('User 1')
        res.body.attachments[0].actions[0].value.should.equals('Simple')
        res.body.attachments[0].actions[1].value.should.equals('Medium')
        res.body.attachments[0].actions[2].value.should.equals('Hard')
        res.body.attachments[0].actions[3].value.should.equals('No-opinion')
        res.body.attachments[0].actions[4].value.should.equals('reveal')

        done()
      })
  })

  it('Reveal the results', (done) => {
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
      .end((err, res) => {
        res.should.have.status(200)
        res.should.be.json
        res.body.text.should.have.string('Medium')

        done()
      })
  })
})


describe('Run single-user multi-votes', () => {

  before((done) => {
    // Clear the database and set up the voting session
    db.flushdb(function () {
      chai.request(app)
        .post('/commands')
        .send({ text: '14_change_my_vote', channel_id: 14 })
        .end((err, res) => {
          done()
        })

    })
  })

  // TODO: makeVote must return a promise!
  const makeVote = function (username, actionValue, next) {
    chai.request(app)
      .post('/actions')
      .send({
        payload: JSON.stringify({
          channel: { id: 14 },
          actions: [{ value: actionValue }],
          user: { name: username },
          original_message: { text: '14_change_my_vote' }
        })
      })
      .end((err, res) => {
        if (err) {
          console.err("Error in makeVote:", err)
          return err;
        }
        var responseText = res.body.attachments[0].text
        next(responseText)
      })
  }

  it('Test double voting by user', function (done) {
    // TODO: makeVote needs to return a promise!
    makeVote('Zsuark', 'Simple', function (responseText) {
      responseText.should.startWith('1 vote(s)')
      responseText.should.have.entriesCount('Zsuark', 1)
      makeVote('tansaku', 'Medium', function (responseText) {
        responseText.should.startWith('2 vote(s)')
        responseText.should.have.entriesCount('Zsuark', 1)
        responseText.should.have.entriesCount('tansaku', 1)
        makeVote('Zsuark', 'Medium', function (responseText) {
          responseText.should.startWith('2 vote(s)')
          responseText.should.have.entriesCount('Zsuark', 1)
          responseText.should.have.entriesCount('tansaku', 1)
          done()
        })
      })
    })
  })

  it('Confirm the results', function (done) {
    // TODO: Promise!
    chai.request(app)
      .post('/actions')
      .send({
        payload: JSON.stringify({
          channel: { id: 14 },
          actions: [{ value: 'reveal' }],
          user: { name: 'Zsuark' },
          original_message: { text: '14_change_my_vote' }
        })
      })
      .end((err, res) => {
        res.should.have.status(200)
        res.should.be.json
        const responseText = res.body.text
        responseText.should.have.string('tansaku Medium')
        responseText.should.have.string('Zsuark Medium')
        responseText.should.have.entriesCount('tansaku', 1)
        responseText.should.have.entriesCount('Zsuark', 1)
        done()
      })
  })




})


describe('Persistence', function (done) {

  before(function (done) {

    // TODO: Promise!
    db.flushdb(() => {
      let votes = {}
      votes['User 1'] = 'Simple'
      db.set(1, JSON.stringify(votes), (err, value) => {
        done()
      })
    });

  })

  it('Record a vote to a restarted session', function (done) {

    // TODO: Promise!
    chai.request(app)
      .post('/actions')
      .send({
        payload: JSON.stringify({
          channel: { id: 1 },
          actions: [{ value: 'Medium' }],
          user: { name: 'User 2' },
          original_message: { text: 'Feature 1' }
        })
      })
      .end((err, res) => {
        res.should.have.status(200)
        res.should.be.json
        res.body.attachments[0].text.should.have.string('2 vote')
        res.body.attachments[0].text.should.have.string('User 1')
        res.body.attachments[0].text.should.have.string('User 2')

        done()
      })
  })

})
