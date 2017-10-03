require('dotenv').config({ path: './.env.example' })

const app = require('./index').app
const server = require('./index').server
const db = require('./index').db

const chai = require('chai')
const should = chai.should()

const nock = require('nock')

chai.use(require('chai-http'))
chai.use(require('chai-string'))

const client_id = process.env.CLIENT_ID
const client_secret = process.env.CLIENT_SECRET
const code = 1;

describe('Landing page', () => {
  it('Display Slack button', (done) => {
    chai.request(server)
      .get('/')
      .end((err, res) => {
        res.should.have.status(200)
        res.should.be.html
        res.text.should.have.string(client_id)

        done()
      })
  })
})

describe('Install app', () => {
  it('Authorize the app', (done) => {

    // Given: External requests are mocked
    nock('https://slack.com')
      .get('/api/oauth.access')
      .query({ code, client_id, client_secret })
      .reply(200)

    chai.request(app)
      .get('/oauth')
      .query({ code, client_id, client_secret })
      .end((err, res) => {
        res.should.redirect

        done()
      })
  })
})

describe('Run a voting session', () => {

  before((done) => {
    db.flushdb(done);
  })

  it('Start a voting session', (done) => {
    chai.request(app)
      .post('/commands')
      .send({ text: 'Feature 1', channel_id: 1, token: process.env.VALIDATION_TOKEN })
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
        actions[0].text.should.equals('Simple (1)')
        actions[1].text.should.equals('Medium (2)')
        actions[2].text.should.equals('Hard (3)')
        actions[3].value.should.equals('No-opinion')
        done()
      })
  })

  it('Record a vote', (done) => {
    chai.request(app)
      .post('/actions')
      .send({
        payload: JSON.stringify({
          channel: { id: 1 },
          actions: [{ value: 'Medium' }],
          user: { name: 'User 1' },
          original_message: { text: 'Feature 1' },
          token: process.env.VALIDATION_TOKEN
        })
      })
      .end((err, res) => {
        res.should.have.status(200)
        res.should.be.json
        res.body.attachments[0].text.should.have.string('1 vote')
        res.body.attachments[0].text.should.have.string('User 1')
        const actions = res.body.attachments[0].actions
        actions[0].value.should.equals('Simple')
        actions[1].value.should.equals('Medium')
        actions[2].value.should.equals('Hard')
        actions[3].value.should.equals('No-opinion')
        actions[4].value.should.equals('reveal')
        actions[0].text.should.equals('Simple (1)')
        actions[1].text.should.equals('Medium (2)')
        actions[2].text.should.equals('Hard (3)')

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
          original_message: { text: 'Feature 1' },
          token: process.env.VALIDATION_TOKEN
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
        .send({ text: '14_change_my_vote', channel_id: 14, token: process.env.VALIDATION_TOKEN })
        .end((err, res) => {
          done()
        })

    })
  })

  const makeVote = function (username, actionValue, next) {
    chai.request(app)
      .post('/actions')
      .send({
        payload: JSON.stringify({
          channel: { id: 14 },
          actions: [{ value: actionValue }],
          user: { name: username },
          original_message: { text: '14_change_my_vote' },
          token: process.env.VALIDATION_TOKEN
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

  it('Confirm the results', (done) => {
    chai.request(app)
      .post('/actions')
      .send({
        payload: JSON.stringify({
          channel: { id: 14 },
          actions: [{ value: 'reveal' }],
          user: { name: 'Zsuark' },
          original_message: { text: '14_change_my_vote' },
          token: process.env.VALIDATION_TOKEN
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


describe('Persistence', (done) => {
  context('begin a voting session', (done) => {
    beforeEach((done) => {

      db.flushdb(() => {
          done()
      });
    })

    it('Records when voting session began', (done) => {
      chai.request(app)
        .post('/commands')
        .send({ text: 'Feature 1', channel_id: 1, token: process.env.VALIDATION_TOKEN })
        .end((err, res) => {
          db.get('1-Feature 1-initiation', (err, reply) =>{
            votes = JSON.parse(reply) || {}
            votes.hasOwnProperty('timestamp-voting-session-start').should.be.true
            isNaN(Date.parse(votes['timestamp-voting-session-start'])).should.be.false
            done()
          })
        })
    })

    it('Records when and by whom a voting session was revealed', (done) => {
      chai.request(app)
        .post('/commands')
        .send({ text: 'Feature 1', channel_id: 1, token: process.env.VALIDATION_TOKEN })
        .end((err, res) => {
          chai.request(app)
            .post('/actions')
            .send({
              payload: JSON.stringify({
                channel: { id: 1 },
                actions: [{ value: 'Medium' }],
                user: { name: 'tansaku' },
                original_message: { text: `<!here> ASYNC VOTE on "${'Feature 1'}"` },
                token: process.env.VALIDATION_TOKEN
              })
            })
            .end((err, res) => {
              chai.request(app)
                .post('/actions')
                .send({
                  payload: JSON.stringify({
                    channel: { id: 1 },
                    actions: [{ value: 'reveal' }],
                    user: { id: 'C8', name: 'tansaku' },
                    original_message: { text: 'Feature 1' },
                    token: process.env.VALIDATION_TOKEN
                  })
                })
                .end((err, res) => {
                  //we do enjoy callback hell
                  db.get("1-Feature 1-revealed", (err, response) => {
                    result = JSON.parse(response) || {}
                    result.hasOwnProperty('timestamp-vote-revealed').should.be.true
                    isNaN(Date.parse(result['timestamp-vote-revealed'])).should.be.false
                    result.hasOwnProperty('user-voting-session-revealor').should.be.true
                    result['user-voting-session-revealor'].should.eq('C8')
                    done()
                  })
                })
              })
          })
    })

    it('Records a users vote after voting session has begun', (done) => {
      chai.request(app)
        .post('/commands')
        .send({ text: 'Feature 1', channel_id: 1, token: process.env.VALIDATION_TOKEN })
        .end((err, res) => {
          chai.request(app)
            .post('/actions')
            .send({
              payload: JSON.stringify({
                channel: { id: 1 },
                actions: [{ value: 'Medium' }],
                user: { name: 'tansaku', id: 'C8' },
                original_message: { text: `<!here> ASYNC VOTE on "${'Feature 1'}"` },
                token: process.env.VALIDATION_TOKEN
              })
            })
            .end((err, res) => {
              db.get('1-Feature 1-record-by-user-id', (err, reply) => {
                votes = JSON.parse(reply) || {}
                votes['C8'].should.eq('Medium')
                done()
              })
            })
        })
    })

    it('Records who began voting session', (done) => {
      chai.request(app)
        .post('/commands')
        .send({ text: 'Feature 1', user_id: "C8", user_name: 'tansaku', channel_id: 1, token: process.env.VALIDATION_TOKEN })
        .end((err, res) => {
          db.get('1-Feature 1-initiation', (err, reply) =>{
            votes = JSON.parse(reply) || {}
            votes.hasOwnProperty('user-voting-session-initiator').should.be.true
            votes['user-voting-session-initiator'].should.eq('C8')
            done()
          })
        })
    })

  })

  context('actions', (done) => {

    beforeEach((done) => {

      db.flushdb(() => {
        let votes = {}
        votes['User 1'] = 'Simple'
        db.set("1-Feature 1", JSON.stringify(votes), (err, value) => {
          done()
        })
      });
    })

    it('Record a vote to a restarted session', (done) => {
      chai.request(app)
        .post('/actions')
        .send({
          payload: JSON.stringify({
            channel: { id: 1 },
            actions: [{ value: 'Medium' }],
            user: { name: 'User 2' },
            original_message: { text: `<!here> ASYNC VOTE on "${'Feature 1'}"` },
            token: process.env.VALIDATION_TOKEN
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

    it('Record the time of a vote', (done) => {
      chai.request(app)
        .post('/actions')
        .send({
          payload: JSON.stringify({
            channel: { id: 1 },
            actions: [{ value: 'Medium' }],
            user: { name: 'User 2', id: 'C8' },
            original_message: { text: `<!here> ASYNC VOTE on "${'Feature 1'}"` },
            token: process.env.VALIDATION_TOKEN
          })
        })
        .end((err, res) => {
          db.get('1-Feature 1-record-by-user-id', (err, reply) =>{
            votes = JSON.parse(reply) || {}
            votes.hasOwnProperty('timestamp-C8').should.be.true
            isNaN(Date.parse(votes['timestamp-C8'])).should.be.false
            done()
          })
        })
    })
  })
})

  // Zsuark - 20170317 - Is this pprint function ever used?
  const pprint = (json) => JSON.stringify(json, null, '\t')
