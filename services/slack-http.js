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
        res.send(formatStart(text))
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
            res.send(formatResult(req.vote_label, votes))
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
          res.send(formatRegister(voteLabel, votes))
        })
        .catch(err => {
          next(err)
        })
    }
  )

  app.listen(port, (err, res) => {
    if (err) throw err;
    else console.log('Listening on port ' + port)
  })

  return app
}


function formatStart(text) {
  return {
    'response_type': 'in_channel',
    'text': `<!here> ASYNC VOTE on "${text}"`,
    'attachments': [{
      'text': 'Please choose a difficulty',
      'fallback': 'Woops! Something bad happens!',
      'callback_id': 'voting_session',
      'color': '#3AA3E3',
      'attachment_type': 'default',
      'actions': [{
        'name': 'Simple',
        'text': 'Simple',
        'type': 'button',
        'value': 'Simple'
      }, {
        'name': 'Medium',
        'text': 'Medium',
        'type': 'button',
        'value': 'Medium'
      }, {
        'name': 'Hard',
        'text': 'Hard',
        'type': 'button',
        'value': 'Hard'
      }, {
        'name': 'No-opinion',
        'text': 'No-opinion',
        'type': 'button',
        'value': 'No-opinion'
      }]
    }]
  }
}

function formatResult(text, votes) {

  const result = Object.keys(votes).map((user) => {
    return `\n@${user} ${votes[user]}`
  })

  const msg = {
    'response_type': 'in_channel',
    'text': `${text} \n${result}`
  }

  return msg
}

function formatRegister(text, votes) {

  // A set of all users who have voted
  const userList = Object.keys(votes).map((user) => {
    return "@" + user
  })
  const voteCount = userList.length
  const users = userList.join(", ")

  const voteText = "" + voteCount + " vote" + ((voteCount == 1) ? "" : "s") +
    " so far [ " + users + " ]"


  return {
    'response_type': 'in_channel',
    'text': text,
    'attachments': [{
      'text': voteText,
      'fallback': 'Woops! Something bad happens!',
      'callback_id': 'voting_session',
      'color': '#3AA3E3',
      'attachment_type': 'default',
      'actions': [{
        'name': 'Simple',
        'text': 'Simple',
        'type': 'button',
        'value': 'Simple'
      }, {
        'name': 'Medium',
        'text': 'Medium',
        'type': 'button',
        'value': 'Medium'

      }, {
        'name': 'Hard',
        'text': 'Hard',
        'type': 'button',
        'value': 'Hard'
      }, {
        'name': 'No-opinion',
        'text': 'No-opinion',
        'type': 'button',
        'value': 'No-opinion'
      }, {
        'name': 'reveal',
        'text': 'Reveal',
        'style': 'danger',
        'type': 'button',
        'value': 'reveal',
        'confirm': {
          'title': 'Are you sure?',
          'text': 'This will reveal all the votes',
          'ok_text': 'Yes',
          'dismiss_text': 'No'
        }
      }]
    }]
  }
}
