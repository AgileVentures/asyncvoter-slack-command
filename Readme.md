# Slack app for Voting on Stories and Tickets remotely (and potentially asynchronously)

AsyncVoter allows an entire Slack team to vote on an issue. AsyncVoter keeps track of the votes and keeps them secret until you're ready to reveal the results. This means the your team does not have to be on Slack at the same time. They can vote asynchronously.

You can vote on any thing: you just provide some text to display. (You can include a line, for example, to a project task.)

## Usage (if already installed in your Slack instance)

1. Type `/voter --help` to get help instructions
2. Run a voting session on an issue launching the new `/voter issue` command in any channel.
3. Submit your vote pressing on any of the three difficulty buttons (Easy, Medium or Hard).
4. Finish and reveal the result of the voting session by pressing on the `Reveal` button. (We recommend to wait until you will receive 3 or more votes)

## Install in a new Slack instance

Install app to your Slack team visiting https://production.asyncvoter.agileventures.org and pressing on the `Add to Slack` button.

## Known Issues

- Votes cannot be reset. But users can vote multiple times on the same issue.

## Questions/feedback?

Create an issue in this repo, or contact us at [#async_voter](https://agileventures.slack.com/messages/async_voter) (free slack account if you sign up at https://www.agileventures.org)

## Requirements

- [Redis](https://redis.io/) v3.2.8 or later
- [Node](https://nodejs.org) v7.4.0 or later

## Development (install locally and connect to test Slack instance)

* Install dependencies:

  ```
  $ npm install
  ```

* copy `.env.example` to `.env`

* ensure [redis](https://redis.io/topics/quickstart) is running

* Run tests 

  ```
  npm test
  ```

* Run the server 

  ```
  npm run dev
  ```

* You **need** to set up your own Slack **team** and Slack **app** to continue!

    - [Create a Slack Team](https://slack.com/create)
    - [Create a Slack app](https://api.slack.com/apps?new_app=1)
    - Install `ngrok` and run `ngrok http 4390` to expose your local server
    - Enable `Slash Commands` in your Slack app with `https://<YOUR-NGROK-URL>/commands`
    - Enable `Interactive Messages` in your Slack app with `https://<YOUR-NGROK-URL>/actions`
    - Rename `.env.example` to `.env` and set your Slack app tokens there
    - Go to <http://localhost:4390> and follow the instructions.

## References

  - [Getting started with Slack apps](https://api.slack.com/slack-apps)
  - [Using ngrok to develop locally for Slack](https://api.slack.com/tutorials/tunneling-with-ngrok)
  - [Sam's blog on the motivation for asyncvoter](https://medium.com/agileventures/fallow-day-9194de55979e)
  - [One of Sam's blogs on the background of AsyncVoter](https://medium.com/agileventures/automating-what-to-do-next-7295c62007d9)
