const request = require('request')

const clientId = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET

var scmp = require('scmp');

function verifyAuthentic(msg, token) {
  // Safe constant-time comparison of token
  return scmp(msg.token, token);
}

module.exports = (app, repository) => {

  app.get('/', (req, res) => {
    res.render('index', { client_id: clientId })
  })

  app.get('/oauth', (req, res) => {

    if (!req.query.code) {
      res.status(500)
      res.send({ 'Error': "Looks like we're not getting code." })
    } else {
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
    }
  })


  // `/voter name of issue http://example.com/ticket_id`
  app.post('/commands', (req, res) => {

    if(!verifyAuthentic(req.body, process.env.VALIDATION_TOKEN)) {
      console.log("Called with wrong verification token");
      res.status(403).send("Not called by Slack");
      return;
    }

    const text = req.body.text
    const channel_id = req.body.channel_id

    // TODO: Close previous session. One session per channel is allowed.
    repository.del(channel_id + text, (err, reply) => {
      // TODO: Save unique voting session. Team + Channel
      repository.set(channel_id + text, JSON.stringify({}), (err, reply) => {
        res.send(formatStart(text))
      })
    })
  })

  app.post('/actions', (req, res) => {

    if(!verifyAuthentic(JSON.parse(req.body.payload), process.env.VALIDATION_TOKEN)) {
      console.log("Called with wrong verification token");
      res.status(403).send("Not called by Slack");
      return;
    }

    const payload = JSON.parse(req.body.payload)

    const actions = payload.actions
    const text = payload.original_message.text
    const user = payload.user.name
    const channel_id = payload.channel.id

    repository.get(channel_id + text, (err, reply) => {
      const votes = JSON.parse(reply) || {}

      if (actions[0].value === 'reveal') {
        res.send(formatResult(text, votes))
      } else {
        // TODO: Count vote for different voting sessions

        votes[user] = [actions[0].value,new Date().toISOString()]

        repository.set(channel_id + text, JSON.stringify(votes), (err, reply) => {
          res.send(formatRegister(text, votes))
        })
      }
    })
  })


  // localsupport_text: { tansaku: '1', mtc2013: 'medium'}

  const ACTIONS = [{
          'name': 'Simple',
          'text': 'Simple (1)',
          'type': 'button',
          'value': 'Simple'
        }, {
          'name': 'Medium',
          'text': 'Medium (2)',
          'type': 'button',
          'value': 'Medium'
        }, {
          'name': 'Hard',
          'text': 'Hard (3)',
          'type': 'button',
          'value': 'Hard'
        }, {
          'name': 'No-opinion',
          'text': 'No-opinion',
          'type': 'button',
          'value': 'No-opinion'
        }]

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
        'actions': ACTIONS
      }]
    }

    return msg
  }

  const formatResult = (text, votes) => {

    const result = Object.keys(votes).map((user) => {
      return `\n@${user} ${votes[user][0]}`
    })

    const msg = {
      'response_type': 'in_channel',
      'text': `${text} \n${result}`
    }

    return msg
  }

  const formatRegister = (text, votes) => {

    // A set of all users who have voted
    const users = Object.keys(votes).map((user) => {
      return "@" + user
    })


    const msg = {
      'response_type': 'in_channel',
      'text': text,
      'attachments': [{
        'text': `${users.length} vote(s) so far [${users}]`,
        'fallback': 'Woops! Something bad happens!',
        'callback_id': 'voting_session',
        'color': '#3AA3E3',
        'attachment_type': 'default',
        'actions': [...ACTIONS, {
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
