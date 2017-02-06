require('dotenv').config({path: './.env.example'})

const server = require('./index')

const chai = require('chai')
const should = chai.should()
const chaiHttp = require('chai-http')

const nock = require('nock')

chai.use(chaiHttp);

const client_id = process.env.CLIENT_ID
const client_secret = process.env.CLIENT_SECRET
const code = 1;

describe('Explain usage', () => {
  it('Display an static site (for now)', (done) => {
    chai.request(server)
    .get('/')
    .end((err, res) => {
      res.should.have.status(200)
      res.should.be.html
      done()
    })
  })
})

describe('Install app', () => {
  it('Authorize the app', (done) => {

    // Given: External requests are mocked
    nock('https://slack.com')
    .get('/api/oauth.access')
    .query({ code, client_id, client_secret})
    .reply(200)

    chai.request(server)
    .get('/oauth')
    .query({ code, client_id, client_secret})
    .end((err, res) => {
      res.should.redirect
      done()
    })
  })
})

describe('Run a voting session', () => {
  it('Start a voting session', (done) => {
    chai.request(server)
    .post('/commands')
    .send({ text: 'Feature 1', channel_id: 1 })
    .end((err, res) => {
      res.should.have.status(200)
      res.should.be.json
      res.should.have.property('text')
      done()
    })
  })

  it('Record a vote', (done) => {
    chai.request(server)
    .post('/actions')
    .send({ 
      payload: JSON.stringify({
        channel: { id: 1 },
        actions: [{ value: 'simple' }],
        user: {},
        original_message: { text: 'Feature 1' }
      })
    })
    .end((err, res) => {
      res.should.have.status(200)
      res.should.be.json
      done()
    })
  })

  it('Reveal the results', () => {
    chai.request(server)
    .post('/actions')
    .send({ 
      payload: JSON.stringify({
        channel: { id: 1 },
        actions: [{ value: 'reveal' }],
        user: {},
        original_message: { text: 'Feature 1' }
      })
    })
    .end((err, res) => {
      res.should.have.status(200)
      res.should.be.json
      done()
    })
  })
})

const pprint = (json) => JSON.stringify(json, null, '\t')