const request = require('request')

const clientId = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET

module.exports = (app, db) => {

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

    // Candidate for promise
    // Need to be able to wrap the request object in a promise,
    // or use a promise friendly version
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
  // A vote being case OR a request to reveal votes
  app.post('/actions', (req, res, next) => {
    // Reveal votes
    const payload = JSON.parse(req.body.payload)

    req.jsonPayload = payload
    const text = payload.original_message.text
    const action = payload.actions[0].value
    if (action == 'reveal') {
      const channel_id = payload.channel.id

      db.getVotes(channel_id)
        .then(votes => {
          res.send(formatResult(text, votes))
        })
        .catch(err => {
          next(err)
        })

    } else next();
  }, (req, res, next) => {
    // We have received a vote

    const payload = req.jsonPayload
    const text = payload.original_message.text
    const user = payload.user.name
    const channel_id = payload.channel.id
    const vote = payload.actions[0].value

    db.giveVote(channel_id, user, vote)
      .then(result => {
        return db.getVotes(channel_id)
      })
      .then(votes => {
        res.send(formatRegister(text, votes))
      })
      .catch(err => {
        next(err)
      })


  })

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

    const result = Object.keys(votes).filter(x => x !== 'text').map((user) => {
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
    const userList = Object.keys(votes).filter(x => x !== 'text').map((user) => {
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
}
