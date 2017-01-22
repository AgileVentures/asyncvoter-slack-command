Slack app for Voting on Stories and Tickets remotely and asynchronously.

## Development

1. Read [Getting started with Slack apps](https://api.slack.com/slack-apps)

2. Install dependencies and run the server
`npm install && npm run dev`

3. Play with the endpoints
`curl localhost:4390`

## Manual testing

Read [Using ngrok to develop locally for Slack](https://api.slack.com/tutorials/tunneling-with-ngrok)

1. Run ngrop locally
`ngrok http 4390`

2. Start local server
`npm dev`

3. Set up a Slack app
- Create an Slack server
- Place tokens in `.env` file
- Enable `Interactive Messages` and `Slash Commands`

4. Go to `localhost:4390` and follow the instructions.

# Live environments

- https://async-voter.herokuapp.com/