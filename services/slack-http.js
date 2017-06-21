// require('dotenv').config()


const request = require('request')


const express = require('express')
const bodyParser = require('body-parser')
const app = express()

app.set('views', __dirname + '/slack-http/views')
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

const config = require('config').get('slack-http')
const clientId = config.client_id
const clientSecret = config.client_secret

const defaultPort = config.port

const formatMessage = require('./slack-http/outboundMessaging')

module.exports = (db, configOptions) => {

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
  }, (req, res, next) => {
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
  app.post('/commands', (req, res, next) => {

    const text = req.body.text
    const channel_id = req.body.channel_id

    db.setupVote(channel_id, text)
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
      const payload = JSON.parse(req.body.payload)
      req.vote_label = payload.original_message.text
      req.user = payload.user.name
      req.channel_id = payload.channel.id
      req.action = payload.actions[0].value
      next()
    },
    (req, res, next) => {
      // Reveal votes

      if (req.action == 'reveal') {
        db.getVotes(req.channel_id)
          .then(votes => {
            res.send(formatMessage.reveal(req.vote_label, votes))
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
      db.giveVote(req.channel_id, req.user, vote)
        .then(result => {
          return db.getVotes(req.channel_id)
        })
        .then(votes => {
          res.send(formatMessage.receiveVote(voteLabel, votes))
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
