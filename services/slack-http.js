const request = require('request')


const express = require('express')
const bodyParser = require('body-parser')
const app = express()

app.set('views', __dirname + '/slack-http/views')
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

const config = require('config').get('slack-http')
const clientId = process.env.CLIENT_ID || config.client_id
const clientSecret = process.env.CLIENT_SECRET || config.client_secret

const defaultPort = config.port

const formatMessage = require('./slack-http/outboundMessaging')

module.exports = (persistence, configOptions) => {

  const port = (configOptions) ? configOptions.port || defaultPort : defaultPort

  app.get('/', (req, res) => {
    res.render('index', { client_id: clientId })
  })

  // callback chaining - let's favour composition
  app.get('/oauth', (req, res, next) => {
      if (req.query.code) next()
      else {
        res.status(500)
        res.send({ 'Error': "Looks like we're not getting code." })
      }
    },
    // TODO: Insert middleware function to save req.query.code ?
    (req, res, next) => {
      // TODO: Promise candidate?
      // TODO: Figure out what to do with the response
      // TODO: Move hardcoded URLs into config
      request({
        url: 'https://slack.com/api/oauth.access',
        qs: { code: req.query.code, client_id: clientId, client_secret: clientSecret },
        method: 'GET'
      }, (error, response, body) => {
        if (error) {
          res.status(500)
          res.send({ 'Error': error })
        } else {
          res.redirect('/')
        }
      })

    })


  // /commands starts a new vote on the given channel
  // On slack: /asyncvoter myFreshIssue http://we.really.care/myproblem
  app.post('/commands', (req, res, next) => {

    const text = req.body.text
    const channel_id = req.body.channel_id

    // This is a promise
    persistence.setupVote(channel_id, text)
      .then(result => {
        res.send(formatMessage.start(text))
      })
      .catch(e => {
        next(e)
      })
  })


  // /actions receives an action regarding an existing
  // voting session
  // An action may either be:
  // A vote being cast OR a request to reveal votes
  app.post('/actions',
    (req, res, next) => {
      // setup for our processing
      // Grab the info we need
      const payload = JSON.parse(req.body.payload)
      req.vote_label = payload.original_message.text
      req.user = payload.user
      req.channel_id = payload.channel.id
      req.action = payload.actions[0].value // "Simple", "Medium", "Hard", "Reveal"
      next()
    },
    (req, res, next) => {
      // Reveal votes
      // TODO: Should anyone be able to reveal the vote?
      // Currently anyone can
      if (req.action == 'Reveal') {

        persistence.getVotes(req.channel_id, req.vote_label)
          .then(votes => {
            res.send(formatMessage.reveal(req.vote_label, votes.votes))
          })
          .catch(err => {
            next(err)
          })
      } else next();

    },
    (req, res, next) => {
      // We have received a vote
      const voteLabel = req.vote_label
      const vote = req.action

      // TODO: What is the maximum number of votes per channel?
      persistence.giveVote(req.channel_id, voteLabel, req.user, vote)
        .then(result => {
          return persistence.getVotes(req.channel_id, voteLabel)
        })
        .then(votes => {
          res.send(formatMessage.receiveVote(voteLabel, votes.votes))
        })
        .catch(err => {
          next(err)
        })
    }
  )

  app.server = app.listen(port, (err, res) => {
    if (err) {
      console.err("Cannot start Slack http service:", err)
      throw err;
    } else console.log('Slack http service listening on port:', port)
  })

  return app
}
