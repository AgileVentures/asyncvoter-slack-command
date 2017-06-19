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


  // /commands seems to delete the votes on the channel, and then start
  // a new vote
  // - I think this cannot be renamed due to slack
  // I don't think we should be deleting!
  app.post('/commands', (req, res, next) => {
    const text = req.body.text
    const channel_id = req.body.channel_id

    db.db.del(channel_id, (err, reply) => {
      db.db.hset(channel_id, "text", text, (err, reply) => {
        if (err) next(err);
        else {
          res.send(formatStart(text))
        }
      })
    })

    // db.* functions should return promises
    // TODO: Promise'ify
    // TODO: Close previous session. One session per channel is allowed.
    // db.del(channel_id, (err, reply) => {
    //   // TODO: Save unique voting session. Team + Channel
    //   db.set(channel_id, JSON.stringify({}), (err, reply) => {
    //     res.send(formatStart(text))
    //   })
    // })
  })

  app.post('/actions', (req, res, next) => {
    const payload = JSON.parse(req.body.payload)
    req.jsonPayload = payload
    const text = payload.original_message.text

    const action = payload.actions[0].value
    if (action !== 'reveal') next();
    else {
      const channel_id = payload.channel.id
      db.db.hgetall(channel_id, (err, votes) => {
        res.send(formatResult(text, votes))
      })
    }
  }, (req, res, next) => {

    const payload = req.jsonPayload
    const text = payload.original_message.text
    const user = payload.user.name
    const channel_id = payload.channel.id
    const action = payload.actions[0].value

    db.db.hset(channel_id, user, action, (err, reply) => {
      if (err) next(err);
      else db.db.hgetall(channel_id, (err, votes) => {
        res.send(formatRegister(text, votes))
      })
    })

    // TODO: Promise'ify
    // Problem - this function results in lost update
    // db.get(channel_id, (err, reply) => {
    //   const votes = JSON.parse(reply) || {}

    //   if (actions[0].value === 'reveal') {
    //     res.send(formatResult(text, votes))
    //   } else {
    //     // TODO: Count vote for different voting sessions

    //     votes[user] = actions[0].value

    //     db.set(channel_id, JSON.stringify(votes), (err, reply) => {
    //       res.send(formatRegister(text, votes))
    //     })
    //   }
    // })
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
        }, {
          'name': 'No-opinion',
          'text': 'No-opinion',
          'type': 'button',
          'value': 'No-opinion'
        }]
      }]
    }

    return msg
  }

  const formatResult = (text, votes) => {

    const result = Object.keys(votes).filter(x => x !== 'text').map((user) => {
      return `\n@${user} ${votes[user]}`
    })

    const msg = {
      'response_type': 'in_channel',
      'text': `${text} \n${result}`
    }

    return msg
  }

  const formatRegister = (text, votes) => {

    // A set of all users who have voted
    const users = Object.keys(votes).filter(x => x !== 'text').map((user) => {
      return "@" + user
    })


    const msg = {
      'response_type': 'in_channel',
      'text': text,
      'attachments': [{
        'text': `${users.length} vote(s) so far [ ${users} ]`,
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

    return msg
  }
}
