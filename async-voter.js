const request = require('request')

const clientId = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET

module.exports = (app) => {

    let votes = []

    app.get('/', (req, res) => {
        res.send('It is working! Path Hit: ' + req.url)
    })

    app.get('/oauth', (req, res) => {
        if (!req.query.code) {
            res.status(500)
            res.send({"Error": "Looks like we're not getting code."})
            console.log("Looks like we're not getting code.")
        } else {
            request({
                url: 'https://slack.com/api/oauth.access',
                qs: {code: req.query.code, client_id: clientId, client_secret: clientSecret},
                method: 'GET',
            }, (error, response, body) => {
                if (error) {
                    console.log(error)
                } else {
                    res.json(body)
                }
            })
        }
    })

    app.post('/commands', (req, res) => {
        const text = req.body.text

        // TODO: Create and store an unique voting session. Issue + Team
        votes = []

        const msg = {
            "response_type": "in_channel",
            "text": `@here ASYNC VOTE on "${text}"`,
            "attachments": [
            {
                "text": "Please choose a dificulty",
                "fallback": "Woops! Something bad happens!",
                "callback_id": "voting_session",
                "color": "#3AA3E3",
                "attachment_type": "default",
                "actions": [
                {
                    "name": "Simple",
                    "text": "Simple",
                    "type": "button",
                    "value": "Simple"
                },
                {
                    "name": "Medium",
                    "text": "Medium",
                    "type": "button",
                    "value": "Simple"
                },
                {
                    "name": "Hard",
                    "text": "Hard",
                    "type": "button",
                    "value": "Simple"
                },
                ]
            }
            ]
        }

        res.send(msg)
    })

    app.post('/actions', (req, res) => {
        const payload = JSON.parse(req.body.payload)

        const actions = payload.actions
        const text = payload.original_message.text
        const user = payload.user

        if (actions[0].value === 'reveal') {
            const result = votes.map((vote) => {return `\n@${vote.user.name} ${vote.vote}`})

            const reveal = {
                "response_type": "in_channel",
                "text": `${text} \n${result}`,
            }

            res.send(reveal)
        } else {
            // TODO: Count vote for different voting sessions
            votes.push({'user': user, 'vote': actions[0].value})

            const users = votes.map((vote) => {return ` @${vote.user.name} `})

            const msg = {
                "response_type": "in_channel",
                "text": text,
                "attachments": [
                {
                    "text": `${votes.length} vote(s) so far [${users}]`,
                    "fallback": "Woops! Something bad happens!",
                    "callback_id": "voting_session",
                    "color": "#3AA3E3",
                    "attachment_type": "default",
                    "actions": [
                    {
                        "name": "Simple",
                        "text": "Simple",
                        "type": "button",
                        "value": "Simple"
                    },
                    {
                        "name": "Medium",
                        "text": "Medium",
                        "type": "button",
                        "value": "Simple"
                    },
                    {
                        "name": "Hard",
                        "text": "Hard",
                        "type": "button",
                        "value": "Simple"
                    },
                    {
                        "name": "reveal",
                        "text": "Reveal",
                        "style": "danger",
                        "type": "button",
                        "value": "reveal",
                        "confirm": {
                            "title": "Are you sure?",
                            "text": "This will reveal all the votes",
                            "ok_text": "Yes",
                            "dismiss_text": "No"
                        }
                    }
                    ]
                }
                ]
            }

            res.send(msg)
        }
    })
}