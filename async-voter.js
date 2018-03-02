const request = require('request')

const clientId = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET

var scmp = require('scmp');

function verifyAuthentic(msg, token) {
  // Safe constant-time comparison of token
  return scmp(msg.token, token);
}

module.exports = (app, repository, avApiClient) => {

  function addStoryToMongoDB(text, channel_id, user_id) {

    var newStory = {
      name: text,
      source: channel_id,
      userId: user_id
    };

    var mongoUidKey = "mongouid-"+ channel_id + "-" + text;

    avApiClient.createStory( newStory, function (err, data, response) {
      if (err) {
        repository.del( mongoUidKey, (delerr, reply) => {
          if (delerr) {
            // handle error?
          }
        });
      }
      else {
        repository.set(mongoUidKey, data._id, (err, reply) => {
          if (err) {
            // handle error?
          }
        });
      }
    })
  }

  function addVoteToMongoDB(text, channel_id, user_id, voteString) {

    var mongoUidKey = "mongouid-"+ channel_id + "-" + text;

    repository.get( mongoUidKey, (err, storyId) => {

      if (err || (!storyId)) {
        // handle error
      }
      else {
        var fields = {
          user_id: user_id,
          size: voteString
        };

        avApiClient.createVote(storyId, fields, (err, data, response) => {
          if (err) {
            // handle error
          }
        });
      }
    });
  }

  function sendRevealToMongoDB(text, channel_id) {
    var mongoUidKey = "mongouid-"+ channel_id + "-" + text;

    repository.get( mongoUidKey, (err, storyId) => {
      if (err) {
      // handle error
      }
      else {
        var fields = {
          // user_id: user_id, //NOTE: we should store id of user who revealed, and timestamp
          size: '4'
        };
        avApiClient.updateStory(storyId, fields, (err, data, response) => {
          if (err) {
            // handle error
          }
        });
      }
    });
  }

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

    if(text === '--help' || text === 'help') {
      res.send(HELPTEXT)
    }
    else {
      // TODO: Close previous session. One session per channel is allowed.
      repository.del(channel_id + "-" + text + "-initiation", (err, reply) => {
        // TODO: Save unique voting session. Team + Channel
        repository.set(channel_id + "-" + text + "-initiation", JSON.stringify({'user-voting-session-initiator':req.body.user_id,
                                                         'timestamp-voting-session-start': new Date().toISOString()}), (err, reply) => {
          res.send(formatStart(text))

          addStoryToMongoDB(text, channel_id, req.body.user_id)
        })
      })
    }
  }) // app.post('/commands'

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
    const user_id = payload.user.id
    const channel_id = payload.channel.id

    const extractTicketDescription = (text) => {
      return text.replace(/^<!here> ASYNC VOTE on \"/,'').replace(/"$/,'')
    }

    const ticket_description = extractTicketDescription(text)

    repository.get(channel_id + "-" + ticket_description, (err, reply) => {

      const votes = JSON.parse(reply) || {}

      if (actions[0].value === 'reveal') {
        repository.set(channel_id+"-"+ticket_description+"-revealed", JSON.stringify({'user-voting-session-revealor' : user_id, 'timestamp-vote-revealed': new Date().toISOString()}), (err, reply) => {
          res.send(formatResult(text, votes))

          sendRevealToMongoDB(text, channel_id)
        })
      } else {
        // TODO: Count vote for different voting sessions

        votes[user] = actions[0].value

        repository.set(channel_id + "-"+ticket_description, JSON.stringify(votes), (err, reply) => {
          repository.get(channel_id + "-" + ticket_description + "-record-by-user-id", (err, reply) => {
            const votes_by_id = JSON.parse(reply) || {}
            votes_by_id[user_id] = actions[0].value
            votes_by_id["timestamp-"+user_id] = new Date().toISOString()
            repository.set(channel_id + "-" + ticket_description + "-record-by-user-id", JSON.stringify(votes_by_id), (err, reply) => {
              res.send(formatRegister(text, votes))

              addVoteToMongoDB(text, channel_id, user_id, actions[0].value)
            })
          })
        })
      }
    })
  })


  // localsupport_text: { tansaku: '1', mtc2013: 'medium'}

  const HELPTEXT = {
     "response_type": "ephemeral",
     "text": "How to use /voter",
     "attachments":[
         {
            "text":"AsyncVoter allows you and your slack team to run 'planning poker' style votes on stories or " +
                   "issues relating to your project. The idea is that everyone can vote in secret and then all votes " +
                   "are revealed at once to expose differences in assumptions and facilitate discussion.\n\n" +
                   "/voter can take any text argument - we recommend that you describe the title of the issue you " +
                   "are planning to vote on, and then a URL to a permanent linked ticket where the results of the " +
                   "vote can be stored.\n\n" +
                   "e.g. /voter Search Local Events https://www.pivotaltracker.com/story/show/45392619\n\n" +
                   "Any number of votes can be started in a channel and run independently. Anyone in the channel can " +
                   "register their vote through the interface that will pop up when a vote is started, voting Simple(1),  " +
                   "Medium(2) or Hard(3) based on how difficult they think it will be to complete work on the issue. " +
                   "Undecided folks can vote 'No Opinion' and when everyone is ready, anyone can press reveal to reveal " +
                   "who voted what.\n\n" +
                   "Voting is no substitute for discussion. Really it's all about communicating with your team and " +
                   "agreeing to compromise when it's time to move on."
         }
     ]
  }

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
