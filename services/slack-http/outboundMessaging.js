// services/slack-http/outboundMessaging.js
function start(text) {
  return {
    'response_type': 'in_channel',
    'text': `<!here> ASYNC VOTE on "${text}"`,
    'attachments': [{
      'text': 'Please choose a difficulty',
      // 'fallback': 'Woops! Something bad happens!',
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


function reveal(text, votes) {

  const result = Object.keys(votes).map((user) => {
    return `\n@${user} ${votes[user]}`
  })

  const msg = {
    'response_type': 'in_channel',
    'text': `${text} \n${result}`
  }

  return msg
}

function receiveVote(text, votes) {

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

module.exports = { start, reveal, receiveVote }
