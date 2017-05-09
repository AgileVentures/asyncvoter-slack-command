const request = require('request')

const clientId = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET

const winston = require('winston')

module.exports = (app, repository) => {

  app.get('/', (req, res) => {
    winston.info('Received GET /')
    res.render('index', { client_id: clientId })
  })

  app.get('/oauth', (req, res) => {
    winston.info('Received GET /oauth')
    if (!req.query.code) {
      winston.error('Received GET /oauth - but no code received')
      res.status(500)
      res.send({ 'Error': "Looks like we're not getting code." })
    } else {
      request({
        url: 'https://slack.com/api/oauth.access',
        qs: { code: req.query.code, client_id: clientId, client_secret: clientSecret },
        method: 'GET'
      }, (error, response, body) => {
        if (error) {
          winston.error('Received GET /oauth - but an error occurred. ' + error)
          res.status(500)
          res.send({ 'Error': error })
        } else {
          winston.info('Received GET /oauth - processed successfully')
          res.redirect('/')
        }
      })
    }
  })

  app.post('/commands', (req, res) => {
    const text = req.body.text
    const channel_id = req.body.channel_id

    winston.info('Received POST /commands')
    winston.info('channel_id: ' + channel_id)
    winston.info('text: ' + text)

    // TODO: Close previous session. One session per channel is allowed.
    repository.del(channel_id, (err, reply) => {
      // TODO: Save unique voting session. Team + Channel
      if (err) {
        winston.error('Repository error deleting channel_id: ' + channel_id)
        winston.error('Error: ' + err)
      } else {
        winston.info('Repository deleted channel_id: ' + channel_id)
        winston.info('Repository reply: ' + reply)
      }
      repository.set(channel_id, JSON.stringify([]), (err, reply) => {
        if (err) {
          winston.error('Repository error deleting channel_id: ' + channel_id)
          winston.error('Error: ' + err)
        } else {
          winston.info('Repository blanked channel_id: ' + channel_id)
          winston.info('Repository reply: ' + reply)
        }
        res.send(formatStart(text))
      })
    })
  })

  app.post('/actions', (req, res) => {
    const payload = JSON.parse(req.body.payload)

    const actions = payload.actions
    const text = payload.original_message.text
    const user = payload.user
    const channel_id = payload.channel.id

    winston.info("Received POST /actions")
    winston.info('text: ' + text)
    winston.info('channel_id: ' + channel_id)
    winston.info('user: ' + JSON.stringify(user))

    repository.get(channel_id, (err, reply) => {
      if (err) {
        winston.error("Repository error getting channel_id: " + channel_id)
        winston.error("Error: " + error)
      } else {
        winston.info("Repository got channel_id: " + channel_id)
        winston.info("Repository reply: " + reply)
      }

      const votes = JSON.parse(reply)

      winston.info('actions[0].value: ' + actions[0].value)

      if (actions[0].value === 'reveal') {
        res.send(formatResult(text, votes))
      } else {
        // TODO: Count vote for different voting sessions
        votes.push({ 'user': user, 'vote': actions[0].value })

        const jsonVotes = JSON.stringify(votes)

        repository.set(channel_id, jsonVotes, (err, reply) => {
          if (err) {
            winston.error("Repository error setting channel_id: " + channel_id)
            winston.error("Votes were: " + jsonVotes)
            winston.error("Error: " + error)
          } else {
            winston.info("Repository set channel_id: " + channel_id)
            winston.info("Votes were: " + jsonVotes)
            winston.info("Repository reply: " + reply)
          }

          res.send(formatRegister(text, votes))
        })
      }
    })
  })

  const formatStart = (text) => {
    const msg = {
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
        }]
      }]
    }

    return msg
  }

  const formatResult = (text, votes) => {
    const result = votes.map((vote) => {
      return `\n@${vote.user.name} ${vote.vote}`
    })

    const msg = {
      'response_type': 'in_channel',
      'text': `${text} \n${result}`
    }

    return msg
  }

  const formatRegister = (text, votes) => {
    const users = votes.map((vote) => {
      return ` @${vote.user.name} `
    })

    const msg = {
      'response_type': 'in_channel',
      'text': text,
      'attachments': [{
        'text': `${votes.length} vote(s) so far [${users}]`,
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

    return msg
  }
}
