const request = require('request')

const clientId = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET

module.exports = (app) => {

    let repository = new Map()

    app.get('/', (req, res) => {
        res.render('index', { client_id: clientId })
    })

    app.get('/oauth', (req, res) => {
        if (!req.query.code) {
            res.status(500)
            res.send({"Error": "Looks like we're not getting code."})
        } else {
            request({
                url: 'https://slack.com/api/oauth.access',
                qs: {code: req.query.code, client_id: clientId, client_secret: clientSecret},
                method: 'GET',
            }, (error, response, body) => {
                if (error) {
                    res.status(500)
                    res.send({"Error": error})
                } else {
                    res.redirect('/')
                }
            })
        }
    })

    app.post('/commands', (req, res) => {
        const text = req.body.text
        const channel_id = req.body.channel_id

        // TODO: Close previous session. One session per channel is allowed.
        if (repository.has(channel_id))
            repository.delete(channel_id)

        // TODO: Save unique voting session. Team + Channel
        repository.set(channel_id, [])

        const msg = {
            "response_type": "in_channel",
            "text": `<!here> ASYNC VOTE on "${text}"`,
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
                    "value": "Medium"
                },
                {
                    "name": "Hard",
                    "text": "Hard",
                    "type": "button",
                    "value": "Hard"
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
        const channel_id = payload.channel.id

        let votes = repository.get(channel_id)

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
            repository.set(channel_id, votes)

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
                        "value": "Medium"
                    },
                    {
                        "name": "Hard",
                        "text": "Hard",
                        "type": "button",
                        "value": "Hard"
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