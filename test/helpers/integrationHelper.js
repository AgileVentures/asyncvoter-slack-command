// module.exports = (chai, app) => {

    //   // Makes a promise to the response text of a vote cast via HTTP
    //   function makeVote(channelId, voteLabel, username, actionValue) {

    //     console.log("Here I am")

    //     return chai.request(app)
    //       .post('/actions')
    //       .send({
    //         payload: JSON.stringify({
    //           channel: { id: channelId },
    //           actions: [{ value: actionValue }],
    //           user: { name: username },
    //           original_message: { text: voteLabel }
    //         })
    //       })
    //       .catch(err => {
    //         console.log("!!!! ERR:", err)
    //       })
    //   }

    //   return { makeVote }
    // }
