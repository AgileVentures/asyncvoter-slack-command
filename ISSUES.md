# Issues for consideration

## This Document

This document is a running sheet of currently issues and other observations. Before merging the current development brach, any outstanding issues here may be discussed and pushed to the issues on GitHub where needed.


## services/persistence/mongo.js

This needs be added to the start of the deleteAllData function

    ```if (process.env.NODE_ENV !== 'test')
      throw Error('You cannot delete data except under test conditions')```

deleteAllData is **extremely** dangerous, and we really need to ensure it is **never**
called on production data

## Problems with tests getting in each other's way - deleteAllData

Because of the somewhat asynchronous nature of testing, you sometimes see this:

```
  58 passing (471ms)
  1 failing

  1) Old tests to be reviewed/refactored Persistence Record a vote to a restarted session:

      AssertionError: expected '0 votes so far [  ]' to equal '1 vote so far [ @User 1 ]'
      + expected - actual

      -0 votes so far [  ]
      +1 vote so far [ @User 1 ]
      
      at castVote.then.res (test/old/old_integration_tests.js:204:31)
      at process._tickCallback (internal/process/next_tick.js:103:7)
```

We need to refactor where and how deleteAllData is being used to avoid this from being a possibility

--RESOLVED-- Feel free to double check

## Asking for test and non-test persistent store connections

Singleton classes in ES6 - http://amanvirk.me/singleton-classes-in-es6/
BUT - https://stackoverflow.com/questions/13179109/singleton-pattern-in-nodejs-is-it-needed
AND - http://fredkschott.com/post/2013/12/node-js-cookbook---designing-singletons/

## Misc

ECMAScript v6 - http://www.ecma-international.org/ecma-262/6.0/
ECMAScript v7 - http://www.ecma-international.org/ecma-262/7.0/
ECMAScript current version - http://www.ecma-international.org/ecma-262/

Mocha/Chai "Cheat sheet" - http://samwize.com/2014/02/08/a-guide-to-mochas-describe-it-and-setup-hooks/

## Mocha issues

- describe.skip() DOES NOT WORK the way you expect :(
- it() does not work within promises' then methods :(

## Asynchronous Timing issues

- What if someone clicks reveal at the same time as some votes, the reveal arrives at the server first....

- Two voting sessions with the same description - what happens - how do we deal?

- Check what IDs slack provides


## Git commits not showing as activity

- https://help.github.com/articles/why-are-my-contributions-not-showing-up-on-my-profile/
- https://help.github.com/articles/about-pull-request-merges/
- Merge without squashing



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