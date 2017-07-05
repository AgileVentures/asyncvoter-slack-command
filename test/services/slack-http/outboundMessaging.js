// test/unit/slack-http/outboundMessaging.js
'use strict'
// Functions to test: start, reveal, receiveVote

const messaging = require(`${process.cwd()}/services/slack-http/outboundMessaging.js`)

describe("slack-http/outboundMessaging tests", function () {

  describe("start function", function () {

    const theText = "(start vote text)"
    const result = messaging.start(theText)

    it("result should be an object", function () {
      var type = typeof result
      type.should.equal("object")
    })

    it("result.response_type should be \"in_channel\"", function () {
      result.response_type.should.equal("in_channel")
    })

    it(`result.text should be: <!here> ASYNC VOTE on "${theText}"`, function () {
      result.text.should.equal(`<!here> ASYNC VOTE on "${theText}"`)
    })

    const attachments = result.attachments

    it("There should only be one attachment", function () {
      attachments.length.should.equal(1, "More than one attachment - there should only be one")
    })

    const attachment = attachments[0]

    it("attachment.text should be: Please choose a difficulty", function () {
      attachment.text.should.equal("Please choose a difficulty",
        `wrong attachment text: ${attachment.text}`)
    })

    const actions = attachment.actions
    it("There should be four actions", function () {
      actions.length.should.equal(4,
        `There was not four actions - found ${actions.length}`)
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

    const votes = {
      "DeveloperA": "Simple",
      "DeveloperB": "Medium",
      "DeveloperC": "Hard"
    }

    const label = "vote label"

    const result = messaging.reveal(label, votes)

    it("result should be an object", function () {
      var type = typeof result
      type.should.equal("object")
    })

    it("result.response_type should be \"in_channel\"", function () {
      result.response_type.should.equal("in_channel")
    })

    it("result.text is in the right form", function () {
      const expectedResultText = `${label}\n\n@DeveloperA Simple,\n@DeveloperB Medium,\n@DeveloperC Hard`
      result.text.should.equal(expectedResultText)
    })

  })

  describe("receiveVote function", function () {
    const voteObjects = [
      { "DeveloperA": "Easy" },
      { "DeveloperB": "Medium", "DeveloperC": "Hard" }
    ]

    voteObjects.forEach(voteObject => {

      const voters = Object.keys(voteObject)
      const singleVote = voters.length == 1
      const voteQuantity = singleVote ?
        "single vote" :
        "multiple votes"

      describe(`${voteQuantity}`, function () {
        // using voteQuantity as the vote label
        const result = messaging.receiveVote(voteQuantity, voteObject)

        it('result should be an object', function () {
          const type = typeof result
          type.should.equal("object")
        })

        it("result.response_type should be \"in_channel\"", function () {
          result.response_type.should.equal("in_channel")
        })


        it("result.text is as expected", function () {
          result.text.should.equal(voteQuantity)
        })

        const attachments = result.attachments

        it("There should only be one attachment", function () {
          attachments.length.should.equal(1, "More than one attachment - there should only be one")
        })

        const attachment = attachments[0]

        it("attachment.text should reflect the number of votes so far",
          function () {

            const attachmentText = singleVote ?
              "1 vote so far [ @DeveloperA ]" :
              "2 votes so far [ @DeveloperB, @DeveloperC ]"


            attachment.text.should.equal(attachmentText)
          })

        const actions = attachment.actions
        it("There should be five actions", function () {
          actions.length.should.equal(5,
            `There was not five actions - found: ${actions.length}`)
        })

        it("The actions should be buttons with: Simple, Medium, Hard, " +
          " No-opinion or Reveal",
          function () {

            const buttons = [
              [0, "Simple"],
              [1, "Medium"],
              [2, "Hard"],
              [3, "No-opinion"],
              [4, "Reveal"]
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
    })
  })


})
