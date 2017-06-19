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

// Promises library
const Promise = require("bluebird")

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
      })
      .catch(throwErr)
  })
})

describe('Install app', function () {
  it('Authorize the app', function () {

    // Given: External requests are mocked
    nock('https://slack.com')
      .get('/api/oauth.access')
      .query({ code, client_id, client_secret })
      .reply(200)

    // TODO: Promise!
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

  before(function (done) {
    db.flushdb(done);
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


describe('Run single-user multi-votes', () => {

  // TODO: Should use promises???
  before((done) => {

    // TODO: db methods need to be made into promises!
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

  // // Makes a promise to the response text of a vote cast via HTTP
  // function makeVote(username, actionValue) {

  //   return new Promise(function (resolve, reject) {
  //     chai.request(app)
  //       .post('/actions')
  //       .send({
  //         payload: JSON.stringify({
  //           channel: { id: 14 },
  //           actions: [{ value: actionValue }],
  //           user: { name: username },
  //           original_message: { text: '14_change_my_vote' }
  //         })
  //       })
  //       .then(res => {
  //         console.log("+_+_+_+_+_+_+_ " + res.body.attachments[0].text)
  //         resolve(res.body.attachments[0].text)
  //       })
  //       .catch(err => { reject(err) })

  //   })
  // }

  // Makes a promise to the response text of a vote cast via HTTP
  function makeVote(username, actionValue) {

    return chai.request(app)
      .post('/actions')
      .send({
        payload: JSON.stringify({
          channel: { id: 14 },
          actions: [{ value: actionValue }],
          user: { name: username },
          original_message: { text: '14_change_my_vote' }
        })
      })

  }


  it('Test double voting by user', function (done) {

    makeVote('Zsuark', 'Simple')
      .end((err, res) => {
        if (err) throwErr(err);

        let responseText = res.body.attachments[0].text

        responseText.should.startWith('1 vote(s)')
        responseText.should.have.entriesCount('Zsuark', 1)
        makeVote('tansaku', 'Medium')
          .end((err, res) => {
            if (err) throwErr(err);

            let responseText = res.body.attachments[0].text

            responseText.should.startWith('2 vote(s)')
            responseText.should.have.entriesCount('Zsuark', 1)
            responseText.should.have.entriesCount('tansaku', 1)

            makeVote('Zsuark', 'Medium')
              .end((err, res) => {
                if (err) throwErr(err);

                let responseText = res.body.attachments[0].text

                responseText.should.startWith('2 vote(s)')
                responseText.should.have.entriesCount('Zsuark', 1)
                responseText.should.have.entriesCount('tansaku', 1)

                done()
              })
          })
      })


    // Promise.all([
    //   makeVote('Zsuark', 'Simple'),
    //   makeVote('tansaku', 'Medium'),
    //   makeVote('Zsuark', 'Medium')
    // ]).then(res => {
    //   // console.log("****  res:", res)
    //   res.length.should.equal(3)
    //   let responseTextList = res.map(x => x.body.attachments[0].text)
    //   console.log("-----++++++++------", responseTextList)
    // }).catch(throwErr)


    // makeVote('Zsuark', 'Simple')
    //   .then(responseText => {
    //     responseText.should.startWith('1 vote(s)')
    //     responseText.should.have.entriesCount('Zsuark', 1)
    //   })
    //   .catch(throwErr)

    // makeVote('tansaku', 'Medium')
    //   .then(responseText => {
    //     responseText.should.startWith('2 vote(s)')
    //     responseText.should.have.entriesCount('Zsuark', 1)
    //     responseText.should.have.entriesCount('tansaku', 1)
    //     makeVote('Zsuark', 'Medium')
    //       .then(responseText => {
    //         responseText.should.startWith('2 vote(s)')
    //         responseText.should.have.entriesCount('Zsuark', 1)
    //         responseText.should.have.entriesCount('tansaku', 1)
    //       })
    //   })
    //   .catch(throwErr)


    // makeVote('Zsuark', 'Medium')
    //   .then(responseText => {
    //     responseText.should.startWith('2 vote(s)')
    //     responseText.should.have.entriesCount('Zsuark', 1)
    //     responseText.should.have.entriesCount('tansaku', 1)
    //   })






    // // TODO: makeVote needs to return a promise!
    // makeVote('Zsuark', 'Simple', function (responseText) {
    //   responseText.should.startWith('1 vote(s)')
    //   responseText.should.have.entriesCount('Zsuark', 1)
    //   makeVote('tansaku', 'Medium', function (responseText) {
    //     responseText.should.startWith('2 vote(s)')
    //     responseText.should.have.entriesCount('Zsuark', 1)
    //     responseText.should.have.entriesCount('tansaku', 1)
    //     makeVote('Zsuark', 'Medium', function (responseText) {
    //       responseText.should.startWith('2 vote(s)')
    //       responseText.should.have.entriesCount('Zsuark', 1)
    //       responseText.should.have.entriesCount('tansaku', 1)
    //       done()
    //     })
    //   })
    // })

  })

  // it('Confirm the results', function (done) {
  it('Confirm the results', function () {
    // TODO: Promise!
    return chai.request(app)
      .post('/actions')
      .send({
        payload: JSON.stringify({
          channel: { id: 14 },
          actions: [{ value: 'reveal' }],
          user: { name: 'Zsuark' },
          original_message: { "text": '14_change_my_vote' }
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
      .catch(throwErr)

    // .end((err, res) => {
    //   console.log("AAA###AAA")
    //   if (err) throwErr(err);

    //   console.log("*@*@*@*@*@**@*@*@*@*")
    //   res.should.have.status(200)
    //   res.should.be.json
    //     // const responseText = res.body.text
    //     // console.log('text:', responseText)
    //     // responseText.should.have.string('tansaku Medium')
    //     // responseText.should.have.string('Zsuark Medium')
    //     // responseText.should.have.entriesCount('tansaku', 1)
    //     // responseText.should.have.entriesCount('Zsuark', 1)
    //   done()
    // })

    // .then(res => {

    //   //   console.log("-----++++++  B  ++++++-----")

    //   // myChai.then(res => {

    //   console.log("-----++++++  C  ++++++-----")

    //   res.should.have.status(200)
    //   res.should.be.json
    //   const responseText = res.body.text
    //   console.log('text:', responseText)
    //   responseText.should.have.string('tansaku Medium')
    //   responseText.should.have.string('Zsuark Medium')
    //   responseText.should.have.entriesCount('tansaku', 1)
    //   responseText.should.have.entriesCount('Zsuark', 1)
    //   done()
    // })
    // .catch(err => {
    //   console.log("-----++++++  D - ERROR!  ++++++-----")
    //   done(err)
    // })
    // myChai.end((err, res) => {


  })

})


describe('Persistence', function (done) {

  before(function (done) {

    // TODO: Promise!
    db.flushdb(() => {
      let votes = {}
        // votes['User 1'] = 'Simple'
      db.db.hmset(1, "text", "test channel 1", "User 1", "Simple", (err, value) => {
        // db.set(1, JSON.stringify(votes), (err, value) => {
        if (err) done(err);
        else done();
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
