# AsyncVoter Development Guide

## Table of Contents
<!-- MarkdownTOC depth=8 -->

- Project Goals
- Tools needed
- How it works
	- Data persistence
		- Functions for persistence and retrieval
- Using git
	- Clone AsyncVoter to your workspace directory:
	- Check out a branch from the GitHub server
	- Normal workflow \(on already fetch'ed branch\)
	- Helpful commands
- Best Practices
	- Funcational JavaScript
	- Testing
	- Unit tests
	- Integration tests
- Potential features
	- Result of voting
	- Re-voting / Multiple rounds of voting
	- Egg timer
- Directory Structure

<!-- /MarkdownTOC -->


## Project Goals

Welcome and thanks for looking in on our team!

AsyncVoter is an implementation of Planning Poker, designed for distributed teams using Slack.

Planning Poker is a software feature time estimation tool. See https://en.wikipedia.org/wiki/Planning_poker

The idea for AsyncVoter was generated and started by Sam Joseph. You can read his blog post on it: [Fallow Day](http://nonprofits.agileventures.org/2016/09/28/fallow-day/ "Fallow Day")

In our implementation, estimates are stated as being "Easy", "Medium" or "Hard".

- Easy: around 2 hours or less
- Medium: around 1/2 day
- Hard: around 1 day or more


This implementation is made for the Agile Ventures Slack team. We would like the software to be customisable to other software and/or Planning Poker options.

## Tools needed

 - node
 - mongo
 - redis
 - git
 - Your favourite text editor or IDE for writing JavaScript.


## How it works

This is how a typical voting session would appear:

Developer A: Start a vote - Feature X http://projectrepo/our/cool/stuff/10_awesome_feature_x
																				
				Please vote Easy, Medium, Hard or Abstain
				on Feature X http://projectrepo/our/cool/stuff/10_awesome_feature_x


Developer A: Easy

				1 vote so far from Developer A


Developer B: Medium

				2 votes so far from Developer A, Developer B


Developer C: Medium

				3 votes so far from Developer A, Developer C, Developer B


Developer A: reveal

				Feature X http://projectrepo/our/cool/stuff/10_x

				Developer C: Medium, Developer A: Easy, Developer B: Medium



### Data persistence

To be clear, there is no database schema _per se_ for AsyncVoting.

We need to be able to:
- start a voting session
- record the votes as they occur
- summarise and reveal the outcome

N.B. channel id and vote description are used as identifiers. User information is also supplied.

_**Provided any persistence store can fulfil these behaviours - we don't care how it's implemented.**_

#### Functions for persistence and retrieval

Here is the expected usages for persisting/retrieving information:

- start a vote:   `persistence.setupVote(channelId, voteDescription)`
- record a vote:  `persistence.giveVote(channelId, voteDescription, user, vote)`
- reveal outcome: `persistence.getVotes(channelId, voteDescription)`

There are two other functions available during testing:

- get the name of the persistence layer (e.g. "mongo")  - `persistence.getName()`
- delete all test data - `persistence.deleteAllData()`

In the mongo persistence store, the current implementation uses 2 stacks, one for voting session details, the other for votes. To stay asynchronous, we only insert and we don't update records/documents - so we eliminate race conditions.

So, if there is some view of the data required, we can extend the persistence layer as needed.

## Using git

### Clone AsyncVoter to your workspace directory:
- `git clone git@github.com:AgileVentures/asyncvoter-slack-command.git`
- `cd asyncvoter-slack-command`

### Check out a branch from the GitHub server
- `git fetch origin zsuark_experimental_test_review`
- `git checkout zsuark_experimental_test_review`
- *... make and test changes ...*
- `git add <file(s) to commit>`
- `git commit -m "Updated x. Added y. Short but expressive description here"`
- For the first push: `git push -u origin/zsuark_experimental_test_review`

### Normal workflow (on already fetch'ed branch)
- `git pull` to ensure we have any changes others have made
- *... make and test changes ...*
- `git add <file(s) to commit>`
- `git commit -m "Updated x. Added y. Short but expressive description here"`
- `git push`

### Helpful commands
- Use `git status` to see the current state of git, file changes, what will be included in the commit, etc.
- Use `git commit -am "<commit message>"` to commit all changes.


## Best Practices

 What is considered best practice is very dependent on context and goals. In our case we are working on a product that is asynchronous and uses Node and JS.


### Funcational JavaScript

ECMAScript 2015 (a.k.a. ES6) brought a number of new functional features to the standard. Node implemented many in v6 and v7, with tail-call optimatisation still to be implemented in the stable version.

Functional software languages have a lot to offer our project goals. They are especially good for asynchronous and distributed processing.

With that in mind, these are the features that are practical for our project:

 - high order functions and function chaining
 - filter
 - map 
 - reduce
 - promises_*_
 - arrow functions
 - let and const
 - ... the spread operator

_* We use the Bluebird Promise npm package. Node has built in promises, however they are not as efficient as Bluebird. As promises have been standardised, there are a number of drop-in replacements. As long as the Promise module conforms to the [Promises/A+](https://promisesaplus.com/ "Promises/A+") standard, it will work interchangeably with others._

We should be favouring the use of Promises over call-backs. It's time to refactor to promises when you start to see "Christmas tree code" a.k.a. "callback hell".


When you do use callbacks within express (httpd service), by convention express uses `(error, next)` as parameters.


### Testing

Test first, test after - just test!

Ideally, we test-first and consistently use TDD. With the introduction of the new software structure, how to test should be clear.

Start with Unit tests - ensure your feature is included in the unit tests for the module you are working on.

We use Mocha and chai for both unit and integration testing.

**Note:** We are testing asynchronously, so we must always return a promise in our tests.

Whenever a function body is enclosed in curly braces `{ ... }` you need to `return` a promise. 

See: 
- [Mocha and promises documentation](https://mochajs.org/#working-with-promises "Mocha and promises documentation")
- [Mocha](https://mochajs.org/ "Mocha")
- [Chai](http://chaijs.com/ "Chai")


### Unit tests

Unit tests are found in `tests/unit/`

So if we have a module called 'FabulousModule', we would find the unit tests in: 
`tests/unit/FabulousModule.js`

### Integration tests

We find the integration tests in `tests/integration/` with each test isolated in it's own file.

For example, we would find tests for "My Fabulous Feature" in `tests/integration/MyFabulousFeature.js`


## Potential features

### Result of voting

Results of voting are persisted with the votes

Further - report back to github, bitbucket or other external service


### Re-voting / Multiple rounds of voting

When not all votes were unanimous, there may be a revote.

Note: Although we have anticipated it, in practise we haven't yet found the need. However it is a part of planning poker.


### Egg timer

Set a maximum time limit before votes are revealed and/or a reminder is given

## Directory Structure

```
asyncvoter-slack-command
├── CONTRIBUTING.md
├── DEVELOPING.md
├── ISSUES.md
├── README.md
├── license.txt
├── package.json
├── server.js
├── services
│   ├── persistence
│   │   ├── mongo.js
│   │   └── redis.js
│   ├── persistence.js
│   ├── slack-http
│   │   ├── outboundMessaging.js
│   │   └── views
│   │       └── index.ejs
│   └── slack-http.js
└── tests
    ├── helpers
    │   └── integrationHelper.js
    ├── integration
    │   ├── installApp.js
    │   ├── landingPage.js
    │   ├── multiVoting.js
    │   └── old_integration_tests.js
    ├── test-defaults.js
    └── unit
        ├── persistence
        │   ├── mongo.js
        │   └── redis.js
        └── persistence.js
```
