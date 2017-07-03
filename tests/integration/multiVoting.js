// const servicesDir = process.cwd() + "/services/"
  // const db = require(servicesDir + "persistence")('mongo')
  //   //   //const app = require(servicesDir + "slack-http")(db, { port: 5555 })
  // const app = require(servicesDir + "slack-http")(db)

// const Promise = require('bluebird')


// const chai = require('chai')
// const should = chai.should()
// chai.use(require('chai-http'))
// chai.use(require('chai-string'))


// describe('Run single-user multi-votes', function () {

//   const voteLabel = '14_change_my_vote'
//   const channelId = '14_test_channel'

//   before(function () {
//     // Clear the database and set up the voting session
//     return db.deleteAllData()
//       .then(res => {
//         return chai.request(app)
//           .post('/commands')
//           .send({ text: voteLabel, channel_id: channelId })
//       })
//       .then(res => {
//         return Promise.resolve(res)
//       })
//       .catch(err => {
//         return Promise.reject(err)
//       })

//   })

//   after(function () {
//     return db.deleteAllData()
//   })

//   // Makes a promise to the response text of a vote cast via HTTP
//   function makeVote(username, actionValue) {

//     return chai.request(app)
//       .post('/actions')
//       .send({
//         payload: JSON.stringify({
//           channel: { id: channelId },
//           actions: [{ value: actionValue }],
//           user: { name: username },
//           original_message: { text: voteLabel }
//         })
//       })

//   }


//   it('Test double voting by user', function () {

//     makeVote('Zsuark', 'Simple')
//       .then(result => {
//         result.body.text.should.contain(voteLabel)
//         let responseText = result.body.attachments[0].text
//         responseText.should.startWith('1 vote')
//         responseText.should.have.entriesCount('Zsuark', 1)
//         return makeVote('tansaku', 'Medium')
//       })
//       .then(result => {
//         let responseText = result.body.attachments[0].text
//         responseText.should.startWith('2 votes')
//         responseText.should.have.entriesCount('Zsuark', 1)
//         responseText.should.have.entriesCount('tansaku', 1)
//         return makeVote('Zsuark', 'Medium')
//       })
//       .then(result => {
//         let responseText = result.body.attachments[0].text
//         responseText.should.startWith('2 votes')
//         responseText.should.have.entriesCount('Zsuark', 1)
//         responseText.should.have.entriesCount('tansaku', 1)
//         console.log("0010100101010101010101010101010100101010")
//         return Promise.resolve(result)
//       })
//       .catch(err => {
//         return Promise.reject(err)
//       })
//   })


//   it('Confirm the results', function () {
//     let request = chai.request(app)
//       .post('/actions')
//       .send({
//         payload: JSON.stringify({
//           channel: { id: channelId },
//           actions: [{ value: 'reveal' }],
//           user: { name: 'Zsuark' },
//           original_message: { "text": voteLabel }
//         })
//       })
//       .then(res => {
//         res.should.have.status(200)
//         res.should.be.json
//         const responseText = res.body.text
//         responseText.should.have.string('tansaku Medium')
//         responseText.should.have.string('Zsuark Medium')
//         responseText.should.have.entriesCount('tansaku', 1)
//         responseText.should.have.entriesCount('Zsuark', 1)
//         console.log("____________±±±±±±±±±±±±±±±±±±±±_______________")
//           // done()
//         return Promise.resolve(res)
//       })
//       .catch(err => {
//         // done(err)
//         return Promise.reject(err)
//       })

//   })

// })
