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

    console.log("hit command endpoint with text and channel_id and key")
    console.log(text)
    console.log(channel_id)
    console.log(channel_id + text)

    // TODO: Close previous session. One session per channel is allowed.
    repository.del(channel_id + text + "-initiation", (err, reply) => {
      // TODO: Save unique voting session. Team + Channel
      repository.set(channel_id + text + "-initiation", JSON.stringify({'user-voting-session-initiator':req.body.user_name,
                                                       'timestamp-voting-session-start': new Date().toISOString()}), (err, reply) => {
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

    const extractTicketDescription = (text) => {
      return text.replace(/^<!here> ASYNC VOTE on \"/,'').replace(/"$/,'')
    }

    const ticket_description = extractTicketDescription(text)

    repository.get(channel_id + ticket_description, (err, reply) => {

      console.log("hit action endpoint with text and channel_id and key")
      console.log(text)
      console.log(channel_id)
      console.log(channel_id + ticket_description)

      const votes = JSON.parse(reply) || {}

      console.log("here is what is in the key already when the action was started")
      console.log(votes)
      if (actions[0].value === 'reveal') {
        res.send(formatResult(text, votes))
      } else {
        // TODO: Count vote for different voting sessions

        votes[user] = actions[0].value
        votes["timestamp-"+user] = new Date().toISOString()

        repository.set(channel_id + ticket_description, JSON.stringify(votes), (err, reply) => {
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

  const isVote = function(key){
    return key.match(/(timestamp-)|(user-voting-session-initiator)/) == null
  }

  const formatResult = (text, votes) => {


    const actual_votes = Object.keys(votes)
                        .filter( key => isVote(key) )
                        .reduce( (res, key) => (res[key] = votes[key], res), {} );
    const result = Object.keys(actual_votes).map((user) => {
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
    const actual_votes = Object.keys(votes)
                        .filter( key => isVote(key) )
                        .reduce( (res, key) => (res[key] = votes[key], res), {} );
    const users = Object.keys(actual_votes).map((user) => {
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
