// test/unit/slack-http/outboundMessaging.js
'use strict'
// Functions to test: start, reveal, receiveVote

const messaging = require(`${process.cwd()}/services/slack-http/outboundMessaging.js`)

describe("slack-http/outboundMessaging tests", function () {

  describe("start function", function () {

    const theText = "(start vote text)"

    const response = messaging.start(theText)

    it("response type should be \"in_channel\"", function () {
      response.response_type.should.equal("in_channel")
    })

    it(`response text should be: <!here> ASYNC VOTE on "${theText}"`, function () {
      response.text.should.equal(`<!here> ASYNC VOTE on "${theText}"`)
    })

    const attachments = response.attachments

    it("There should only be one attachment", function () {
      attachments.length.should.equal(1, "More than one attachment - there should only be one")
    })

    const attachment = attachments[0]

    it("attachment text should be: Please choose a difficulty", function () {
      attachment.text.should.equal("Please choose a difficulty",
        `wrong attachment text: ${attachment.text}`)
    })

    const actions = attachment.actions
    it("There should be four actions", function () {
      actions.length.should.equal(4, "There was not four actions - found")
    })

    it("The actions should be buttons with: Simple, Medium, Hard or No-opinion",
      function () {

        const buttons = [
          [0, "Simple"],
          [1, "Medium"],
          [2, "Hard"],
          [3, "No-opinion"]
        ]

        buttons.forEach(([i, label]) => {

          actions[i].type.should.equal("button",
            `actions[${i}].type should be "button", ` +
            `but instead is: "${actions[i].type}"`);

          ["name", "text", "value"].forEach((element) => {
            actions[i][element].should.equal(label,
              `actions[${i}].${element} should be "${label}", ` +
              `but we found: "${actions[i][element]}"`)
          })

        })

      })


  })

  describe("reveal function", function () {

  })

  describe("receiveVote function", function () {

  })

})
