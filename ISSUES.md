# Issues for consideration

## This Document

This document is a running sheet of currently issues and other observations. Before merging the current development brach, any outstanding issues here may be discussed and pushed to the issues on GitHub where needed.


## Misc

ECMAScript v6 - http://www.ecma-international.org/ecma-262/6.0/
ECMAScript v7 - http://www.ecma-international.org/ecma-262/7.0/
ECMAScript current version - http://www.ecma-international.org/ecma-262/

Mocha/Chai "Cheat sheet" - http://samwize.com/2014/02/08/a-guide-to-mochas-describe-it-and-setup-hooks/

Singleton classes in ES6 - http://amanvirk.me/singleton-classes-in-es6/

describe.skip() DOES NOT WORK the way you expect :(

## Asynchronous Timing issues

- What if someone clicks reveal at the same time as some votes, the reveal arrives at the server first....

- Two voting sessions with the same description - what happens - how do we deal?

- Check what IDs slack provides


## Documentation

- Documentation is brought up-to-date with experimental branch before pushing/merging

## Security

### Should anyone be able to reveal the vote?
- Currently anyone can

### We should be checking that incoming connections actually come from Slack

## Testing

### services/slack-http/outboundMessaging.js

- What are the actual correct formats of the messages? I'm guessing in my tests.
- https://api.slack.com/docs/messages